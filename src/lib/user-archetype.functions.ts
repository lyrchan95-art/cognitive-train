import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluate, QUESTIONS } from "./quiz";

const responsesSchema = z.record(z.string(), z.number().int().min(1).max(5));

export const saveQuizResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => responsesSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Guard: require at least one answer per question.
    const missing = QUESTIONS.filter((q) => data[q.id] == null).map((q) => q.id);
    if (missing.length) {
      throw new Error(`Missing responses: ${missing.join(", ")}`);
    }
    const result = evaluate(data);

    const { error } = await context.supabase
      .from("user_archetype")
      .upsert(
        {
          user_id: context.userId,
          archetype_slug: result.archetypeSlug,
          confidence: Number(result.confidence.toFixed(4)),
          dimension_scores: result.dimensions,
          responses: data,
          taken_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) throw new Error(error.message);
    return {
      archetypeSlug: result.archetypeSlug,
      confidence: result.confidence,
      dimensions: result.dimensions,
    };
  });

export const getMyArchetype = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_archetype")
      .select("archetype_slug, confidence, dimension_scores, taken_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
