import { createServerFn } from "@tanstack/react-start";
import { hkToday } from "./checkins.functions";
import { demoAuditResponses, demoCheckIns, demoQuizResponses } from "./demo-seed";
import { LEGAL_VERSION } from "./legal";
import { evaluate } from "./quiz";
import { scoreAudit } from "./workplace-audit";

/** Demo accounts are deleted after this long. */
const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
/** Refuse new demos beyond this many live ones, so the button can't be used to flood the user table. */
const MAX_LIVE_DEMOS = 300;

/**
 * Creates a fresh, pre-filled demo account and returns one-time credentials for
 * the browser to sign in with. Each visitor gets their own sandbox, so nothing
 * they do is seen by anyone else, and every demo account is removed after 24 hours.
 */
export const startDemoSession = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");

  // Clean up expired demos first, and count the live ones.
  const { data: list, error: listError } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error("The demo is unavailable right now. Please try again shortly.");
  const now = Date.now();
  const demos = list.users.filter((u) => u.user_metadata?.is_demo === true);
  const expired = demos.filter((u) => now - Date.parse(u.created_at) > DEMO_TTL_MS);
  await Promise.all(expired.map((u) => sb.auth.admin.deleteUser(u.id)));
  if (demos.length - expired.length >= MAX_LIVE_DEMOS) {
    throw new Error("The demo is busy right now. Please try again later.");
  }

  const email = `demo-${crypto.randomUUID()}@example.com`;
  const password = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const { data: created, error: createError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "Demo Reviewer",
      is_demo: true,
      terms_version: LEGAL_VERSION,
      terms_accepted_at: new Date().toISOString(),
    },
  });
  if (createError || !created.user) {
    throw new Error("Could not create a demo account. Please try again.");
  }
  const userId = created.user.id;

  try {
    const quizResponses = demoQuizResponses();
    const quiz = evaluate(quizResponses);
    const auditResponses = demoAuditResponses();
    const audit = scoreAudit(auditResponses);

    const seeded = await Promise.all([
      sb.from("user_archetype").upsert(
        {
          user_id: userId,
          archetype_slug: quiz.archetypeSlug,
          confidence: Number(quiz.confidence.toFixed(4)),
          dimension_scores: quiz.dimensions,
          responses: quizResponses,
          taken_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      ),
      sb.from("workplace_audits").insert({
        user_id: userId,
        ...audit.dimensions,
        toxicity_score: audit.toxicity,
        responses: auditResponses,
      }),
    ]);
    for (const r of seeded) if (r.error) throw new Error(r.error.message);

    // Check-ins need the daily_checkins migration; the rest of the demo still
    // works without it, so a failure here is logged rather than fatal.
    const { error: checkInError } = await sb.from("daily_checkins").insert(
      demoCheckIns(hkToday()).map((c) => ({
        user_id: userId,
        checkin_date: c.date,
        energy: c.energy,
        stress: c.stress,
        workload: c.workload,
        control: c.control,
      })),
    );
    if (checkInError) console.error("[demo] check-in seed failed:", checkInError.message);
  } catch (e) {
    await sb.auth.admin.deleteUser(userId);
    console.error("[demo] seed failed:", e);
    throw new Error("Could not prepare the demo. Please try again.");
  }

  return { email, password };
});
