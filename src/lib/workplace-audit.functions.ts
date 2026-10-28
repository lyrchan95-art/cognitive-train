import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AUDIT_QUESTIONS, scoreAudit } from "./workplace-audit";

const schema = z.record(z.string(), z.number().int().min(1).max(5));

export const saveWorkplaceAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const missing = AUDIT_QUESTIONS.filter((q) => data[q.id] == null);
    if (missing.length) throw new Error(`Missing responses: ${missing.map((m) => m.id).join(", ")}`);
    const { dimensions, toxicity } = scoreAudit(data);
    const { error } = await context.supabase.from("workplace_audits").insert({
      user_id: context.userId,
      autonomy: dimensions.autonomy,
      psychological_safety: dimensions.psychological_safety,
      workload: dimensions.workload,
      recognition: dimensions.recognition,
      purpose: dimensions.purpose,
      toxicity_score: toxicity,
      responses: data,
    });
    if (error) throw new Error(error.message);
    return { dimensions, toxicity };
  });

export const getLatestAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workplace_audits")
      .select("autonomy, psychological_safety, workload, recognition, purpose, toxicity_score, taken_at")
      .eq("user_id", context.userId)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
