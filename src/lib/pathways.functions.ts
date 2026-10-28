import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function serverPublic() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type PathwaySummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  archetype_slug: string;
  icon: string;
  difficulty: string;
  duration_days: number;
  hero_image_url: string | null;
  sort_order: number;
  required_streak: number;
  certificate_title: string | null;
  completed_days?: number;
};

export const listPathways = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverPublic();
  const { data, error } = await sb
    .from("pathways")
    .select("id, slug, title, description, archetype_slug, icon, difficulty, duration_days, hero_image_url, sort_order, required_streak, certificate_title")
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PathwaySummary[];
});

export const myPathways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: rows }, { data: mine }, { data: progress }] = await Promise.all([
      supabase
        .from("pathways")
        .select("id, slug, title, description, archetype_slug, icon, difficulty, duration_days, hero_image_url, sort_order, required_streak, certificate_title")
        .eq("published", true)
        .order("sort_order", { ascending: true }),
      supabase.from("user_archetype").select("archetype_slug").eq("user_id", userId).maybeSingle(),
      supabase.from("pathway_progress").select("pathway_id, day_number, xp_awarded").eq("user_id", userId),
    ]);
    const { data: streakRow } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle();
    const currentStreak = Math.max(streakRow?.current_streak ?? 0, streakRow?.longest_streak ?? 0);
    const counts = new Map<string, number>();
    let totalXp = 0;
    (progress ?? []).forEach((p) => {
      counts.set(p.pathway_id, (counts.get(p.pathway_id) ?? 0) + 1);
      totalXp += (p as any).xp_awarded ?? 50;
    });
    const list = (rows ?? []).map((r) => ({ ...r, completed_days: counts.get(r.id) ?? 0 })) as PathwaySummary[];
    if (mine?.archetype_slug) {
      list.sort((a, b) => {
        const aa = a.archetype_slug === mine.archetype_slug ? -1 : 0;
        const bb = b.archetype_slug === mine.archetype_slug ? -1 : 0;
        return aa - bb;
      });
    }
    const completedPathways = list.filter((p) => (p.completed_days ?? 0) >= p.duration_days).length;
    return { myArchetype: mine?.archetype_slug ?? null, pathways: list, totalXp, completedPathways, currentStreak };
  });

export const getPathwayBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: p, error } = await sb
      .from("pathways")
      .select("id, slug, title, description, archetype_slug, icon, difficulty, duration_days, hero_image_url, sort_order, required_streak, certificate_title")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Pathway not found");
    const { data: days } = await sb
      .from("pathway_days")
      .select("id, day_number, title, subtitle, content, action_prompt, read_minutes, quiz_question, quiz_options, quiz_answer_index")
      .eq("pathway_id", p.id)
      .order("day_number", { ascending: true });
    return { pathway: p, days: days ?? [] };
  });

export const getMyPathwayProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pathwayId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("pathway_progress")
      .select("day_number, completed_at, journal_entry, xp_awarded")
      .eq("user_id", context.userId)
      .eq("pathway_id", data.pathwayId);
    return rows ?? [];
  });

/** Complete a day: requires correct quiz + journal entry. Awards XP. Sequential unlock enforced. */
export const completePathwayDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pathwayId: z.string().uuid(),
        dayNumber: z.number().int().min(1).max(30),
        journalEntry: z.string().min(10).max(4000),
        quizCorrect: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: gate } = await supabase
      .from("pathways")
      .select("required_streak, duration_days")
      .eq("id", data.pathwayId)
      .maybeSingle();
    if ((gate?.required_streak ?? 0) > 0) {
      const { data: st } = await supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId)
        .maybeSingle();
      const best = Math.max(st?.current_streak ?? 0, st?.longest_streak ?? 0);
      if (best < (gate?.required_streak ?? 0)) throw new Error("This program unlocks at a longer daily streak");
    }
    if (data.dayNumber > 1) {
      const { data: prev } = await supabase
        .from("pathway_progress")
        .select("day_number")
        .eq("user_id", userId)
        .eq("pathway_id", data.pathwayId)
        .eq("day_number", data.dayNumber - 1)
        .maybeSingle();
      if (!prev) throw new Error("Complete previous day first");
    }
    const xp = 50 + (data.dayNumber === (gate as any)?.duration_days ? 150 : 0);
    const { error } = await supabase
      .from("pathway_progress")
      .upsert(
        {
          user_id: userId,
          pathway_id: data.pathwayId,
          day_number: data.dayNumber,
          journal_entry: data.journalEntry,
          quiz_correct: true,
          xp_awarded: xp,
        },
        { onConflict: "user_id,pathway_id,day_number" },
      );
    if (error) throw new Error(error.message);
    return { xp };
  });

export const resetPathwayDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ pathwayId: z.string().uuid(), dayNumber: z.number().int().min(1).max(30) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pathway_progress")
      .delete()
      .eq("user_id", context.userId)
      .eq("pathway_id", data.pathwayId)
      .eq("day_number", data.dayNumber);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", context.userId)
      .maybeSingle();
    return Math.max(data?.current_streak ?? 0, data?.longest_streak ?? 0);
  });
