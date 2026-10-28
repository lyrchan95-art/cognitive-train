import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getArchetype } from "@/data/archetypes";

const BRIEFING_COLS =
  "id, content, focus, micro_action, read_at, briefing_date, archetype_slug, toxicity_alert, evening_prompt, reflection, ai_validation, action_done_at, reflection_done_at";

/**
 * Get today's briefing for the current user. Lazily generates one via
 * Lovable AI Gateway on first read for the day. Also updates the streak.
 */
export const getTodaysBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("daily_briefings")
      .select(BRIEFING_COLS)
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .maybeSingle();
    if (existing) return existing;

    const { data: mine } = await supabase
      .from("user_archetype")
      .select("archetype_slug, dimension_scores")
      .eq("user_id", userId)
      .maybeSingle();
    if (!mine) throw new Error("Take the quiz first to receive a personalized briefing.");

    const archetype = getArchetype(mine.archetype_slug);
    if (!archetype) throw new Error("Archetype not found.");

    const { data: audit } = await supabase
      .from("workplace_audits")
      .select("autonomy, psychological_safety, workload, recognition, purpose, toxicity_score")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const generated = await generateBriefing({
      archetypeName: archetype.name,
      archetypeTagline: archetype.tagline,
      strengths: archetype.strengths.map((s) => s.title),
      shadows: archetype.blindSpots.map((s) => s.title),
      triggers: archetype.toxicityTrigger?.items ?? [],
      audit,
    });

    const { data: inserted, error: insErr } = await supabase
      .from("daily_briefings")
      .insert({
        user_id: userId,
        briefing_date: today,
        archetype_slug: mine.archetype_slug,
        content: generated.content,
        focus: generated.focus,
        micro_action: generated.micro_action,
        toxicity_alert: generated.toxicity_alert,
        evening_prompt: generated.evening_prompt,
      })
      .select(BRIEFING_COLS)
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted;
  });

/** Phase 1 → Phase 2: user acknowledges the trigger / reads the briefing. */
export const markBriefingRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    await supabase
      .from("daily_briefings")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .is("read_at", null);

    const { data: existing } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_check_in, total_briefings_read")
      .eq("user_id", userId)
      .maybeSingle();

    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);

    let current = 1;
    let longest = 1;
    let total = 1;
    if (existing) {
      total = (existing.total_briefings_read ?? 0) + (existing.last_check_in === today ? 0 : 1);
      if (existing.last_check_in === today) current = existing.current_streak;
      else if (existing.last_check_in === yesterday) current = (existing.current_streak ?? 0) + 1;
      else current = 1;
      longest = Math.max(existing.longest_streak ?? 0, current);
    }
    await supabase.from("user_streaks").upsert({
      user_id: userId,
      current_streak: current,
      longest_streak: longest,
      last_check_in: today,
      total_briefings_read: total,
    });
    return { current_streak: current, longest_streak: longest, total_briefings_read: total };
  });

/** Phase 2 → Phase 3: user marks the Daily Prescription as done. */
export const completeDailyAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("daily_briefings")
      .update({ action_done_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .is("action_done_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Phase 3: user submits an evening reflection; AI returns a validating response. */
export const submitReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ reflection: z.string().min(3).max(2000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { data: b } = await supabase
      .from("daily_briefings")
      .select("archetype_slug, micro_action, focus")
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .maybeSingle();
    if (!b) throw new Error("No briefing to reflect on yet.");

    const archetype = getArchetype(b.archetype_slug);
    const validation = await generateValidation({
      archetypeName: archetype?.name ?? "You",
      microAction: b.micro_action,
      focus: b.focus,
      reflection: data.reflection,
    });

    const { error } = await supabase
      .from("daily_briefings")
      .update({
        reflection: data.reflection,
        ai_validation: validation,
        reflection_done_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("briefing_date", today);
    if (error) throw new Error(error.message);
    return { ai_validation: validation };
  });

export const getMyStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_check_in, total_briefings_read, total_articles_read")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (
      data ?? {
        current_streak: 0,
        longest_streak: 0,
        last_check_in: null,
        total_briefings_read: 0,
        total_articles_read: 0,
      }
    );
  });

// ---------- AI generation ----------

type BriefingGen = {
  content: string;
  focus: string;
  micro_action: string;
  toxicity_alert: string;
  evening_prompt: string;
};

async function generateBriefing(input: {
  archetypeName: string;
  archetypeTagline: string;
  strengths: string[];
  shadows: string[];
  triggers: string[];
  audit: {
    autonomy: number;
    psychological_safety: number;
    workload: number;
    recognition: number;
    purpose: number;
    toxicity_score: number;
  } | null;
}): Promise<BriefingGen> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const fallback = (): BriefingGen => ({
    content: `Today, your ${input.archetypeName} mind is at its best when it channels ${input.strengths[0]?.toLowerCase() ?? "its natural strength"} without letting ${input.shadows[0]?.toLowerCase() ?? "old patterns"} run the show.`,
    focus: input.strengths[0] ?? "Presence",
    micro_action: `Do one counterintuitive move: ${input.shadows[0] ? "step away from " + input.shadows[0].toLowerCase() : "trust the pause"}.`,
    toxicity_alert: `${input.archetypeName}, ${input.triggers[0] ?? "the environment is shifting"}. This triggers your ${input.shadows[0]?.toLowerCase() ?? "old pattern"}. Here is your playbook.`,
    evening_prompt: `What happened when you tried the counter-move today? Where did the resistance show up?`,
  });
  if (!apiKey) return fallback();

  const auditLine = input.audit
    ? `Workplace signal (0=toxic, 1=healthy): autonomy ${input.audit.autonomy}, safety ${input.audit.psychological_safety}, workload ${input.audit.workload}, recognition ${input.audit.recognition}, purpose ${input.audit.purpose}.`
    : "No workplace audit yet — keep guidance internal.";

  const system = `You are the Cognitive Atelier — a warm, literary coach designing a daily behavioral loop (Trigger → Action → Reward) for one person, based on their archetype.

Return STRICT JSON with keys:
- "toxicity_alert": string, <=28 words. PHASE 1 — Morning trigger. Second-person, name a real environmental pressure that inflames this archetype's shadow. Frame urgency without alarmism. End with a promise: "Here is your playbook."
- "focus": string, <=4 words. The identity theme for today.
- "content": string, 2 short paragraphs, <=110 words total, second-person, no bullets, no headers, no emoji. Names the pattern and reframes it.
- "micro_action": string, <=22 words. PHASE 2 — the Daily Prescription. Counterintuitive by design: it must BREAK this archetype's usual loop (e.g. a Sentinel delegates, a Visionary picks ONE idea and executes). Concrete, doable in a workday.
- "evening_prompt": string, <=24 words. PHASE 3 — Evening Reflection question. Invites them to notice resistance and what happened when they pushed through.

No preamble, no markdown, JSON only.`;
  const user = `Archetype: ${input.archetypeName} — ${input.archetypeTagline}
Strengths: ${input.strengths.join(", ")}
Shadow loops: ${input.shadows.join(", ")}
Common triggers: ${input.triggers.join(", ") || "unspecified"}
${auditLine}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!resp.ok) {
      console.error("AI gateway error", resp.status, await resp.text());
      return fallback();
    }
    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback();
    const parsed = JSON.parse(match[0]) as Partial<BriefingGen>;
    if (!parsed.focus || !parsed.micro_action || !parsed.content) return fallback();
    const fb = fallback();
    return {
      focus: parsed.focus,
      micro_action: parsed.micro_action,
      content: parsed.content,
      toxicity_alert: parsed.toxicity_alert ?? fb.toxicity_alert,
      evening_prompt: parsed.evening_prompt ?? fb.evening_prompt,
    };
  } catch (e) {
    console.error("AI generation failed", e);
    return fallback();
  }
}

async function generateValidation(input: {
  archetypeName: string;
  microAction: string;
  focus: string;
  reflection: string;
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const fallback = () =>
    `You felt the resistance and moved through it anyway. That's the ${input.archetypeName} growing — not by force, but by choice. Note this moment; tomorrow's loop starts here.`;
  if (!apiKey) return fallback();

  const system = `You are the Cognitive Atelier — the reward voice at the end of a daily Trigger→Action→Reward loop. In 2 short sentences (<=55 words total), validate the user's growth, name the resistance they moved through, and connect it to their archetype identity. Warm, literary, no emoji, no lists.`;
  const user = `Archetype: ${input.archetypeName}
Today's focus: ${input.focus}
Prescription attempted: ${input.microAction}
Their reflection: "${input.reflection}"`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!resp.ok) return fallback();
    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || fallback();
  } catch {
    return fallback();
  }
}
