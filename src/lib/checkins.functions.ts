import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBurnoutRisk, type CheckIn } from "./burnout-risk";

const likert = z.number().int().min(1).max(5);
const checkInSchema = z.object({
  energy: likert,
  stress: likert,
  workload: likert,
  control: likert,
});

/** Check-in days roll over at midnight Hong Kong time. */
function hkToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export const saveCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkInSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("daily_checkins").upsert(
      {
        user_id: context.userId,
        checkin_date: hkToday(),
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,checkin_date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyBurnoutRisk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = hkToday();
    const [checkIns, audit, archetype] = await Promise.all([
      context.supabase
        .from("daily_checkins")
        .select("checkin_date, energy, stress, workload, control")
        .eq("user_id", context.userId)
        .gte("checkin_date", shiftDate(today, -13))
        .order("checkin_date", { ascending: true }),
      context.supabase
        .from("workplace_audits")
        .select("autonomy, psychological_safety, workload, recognition, purpose")
        .eq("user_id", context.userId)
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("user_archetype")
        .select("archetype_slug, dimension_scores")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    for (const r of [checkIns, audit, archetype]) {
      if (r.error) throw new Error(r.error.message);
    }

    const rows: CheckIn[] = (checkIns.data ?? []).map((c) => ({
      date: c.checkin_date,
      energy: c.energy,
      stress: c.stress,
      workload: c.workload,
      control: c.control,
    }));
    const a = audit.data;
    const dims = archetype.data?.dimension_scores as Record<string, number> | null | undefined;

    const risk = computeBurnoutRisk({
      today,
      checkIns: rows,
      audit: a
        ? {
            autonomy: Number(a.autonomy),
            psychological_safety: Number(a.psychological_safety),
            workload: Number(a.workload),
            recognition: Number(a.recognition),
            purpose: Number(a.purpose),
          }
        : null,
      archetypeSlug: archetype.data?.archetype_slug ?? null,
      traits: dims ? { N: dims.N, S: dims.S, A: dims.A } : null,
    });

    const todays = rows.find((r) => r.date === today) ?? null;
    return { risk, today: todays, hasAudit: !!a };
  });
