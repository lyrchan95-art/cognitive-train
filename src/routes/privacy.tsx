import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/site/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "What personal data The Cognitive Atelier collects, why, who can see it, and your rights under Hong Kong's Personal Data (Privacy) Ordinance.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro={
        <p>
          The Cognitive Atelier handles information about how you feel and how you work. This policy
          explains, in plain language, what we collect, why, who can see it, and how you can see,
          correct, download or delete it. It is written to meet Hong Kong's Personal Data (Privacy)
          Ordinance (Cap. 486, "PDPO").
        </p>
      }
    >
      <LegalSection title="1. Who we are">
        <p>
          The Cognitive Atelier is operated by {OPERATOR.name} ("we", "us"), the data user
          responsible for your personal data. Contact us about privacy at{" "}
          <strong className="text-ink">{OPERATOR.email}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul>
          <li>
            <strong className="text-ink">Account details:</strong> your email address and the name
            you give us. One-click test accounts use made-up sample data, hold no personal details,
            and are deleted automatically after 24 hours.
          </li>
          <li>
            <strong className="text-ink">Assessment answers:</strong> your 30 answers, the six
            dimension scores calculated from them, and your assigned archetype.
          </li>
          <li>
            <strong className="text-ink">Workplace audit answers</strong> and the scores calculated
            from them.
          </li>
          <li>
            <strong className="text-ink">Daily check-ins</strong> (energy, stress, workload,
            control) and the burnout-risk score calculated from them.
          </li>
          <li>
            <strong className="text-ink">What you write:</strong> evening reflections and
            learning-pathway journal entries.
          </li>
          <li>
            <strong className="text-ink">Usage:</strong> briefings you open and complete, streaks,
            articles you like, and pathway progress.
          </li>
          <li>
            <strong className="text-ink">Pilot requests:</strong> the name, work email, company and
            team size you submit on our{" "}
            <Link to="/teams" className="text-accent hover:underline">
              teams page
            </Link>
            .
          </li>
        </ul>
        <p>
          Wellbeing information is sensitive. Only give us what you are comfortable sharing; the
          assessment, audit and check-ins are always optional.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <ul>
          <li>
            To run the service: assign your archetype, calculate your risk score, and write your
            daily briefing.
          </li>
          <li>To produce aggregate team reports during a team pilot (see section 5).</li>
          <li>
            To improve and validate our methods — for example, checking the assessment's reliability
            or re-fitting the risk model. This analysis is done inside our team, and anything we
            publish or share is aggregated so that no individual can be identified.
          </li>
          <li>To reply to you and to run pilots you have asked us about.</li>
        </ul>
        <p>
          We do not sell your personal data, use it for advertising, or use it for any purpose
          unrelated to these without your consent.
        </p>
      </LegalSection>

      <LegalSection title="4. AI-generated briefings">
        <p>
          Your daily briefing and the reply to your evening reflection are written by an AI model
          (Google Gemini, accessed through Lovable's AI gateway). To do this we send your archetype,
          its typical strengths and triggers, your latest workplace-audit scores and — for the reply
          — the text of your reflection. We do not send your name or email. Please don't put details
          that identify you or others in your reflections.
        </p>
      </LegalSection>

      <LegalSection title="5. Employers and team pilots">
        <ul>
          <li>
            Your employer never sees your individual answers, check-ins, reflections or risk score.
          </li>
          <li>
            Team reports show aggregates only, and any group of fewer than five people is never
            reported on.
          </li>
          <li>
            Your scores must never be used for hiring, performance or disciplinary decisions; our
            terms forbid it.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Who processes your data">
        <p>
          We use these service providers to run the platform, under their data-processing terms:
        </p>
        <ul>
          <li>Supabase — database and sign-in.</li>
          <li>Cloudflare — website hosting.</li>
          <li>Lovable — application platform and AI gateway; Google — the AI model.</li>
        </ul>
        <p>
          These providers may store or process data outside Hong Kong. We share data only as needed
          to provide the service, or where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="7. How long we keep it">
        <p>
          We keep your data while your account is open. When you delete your account, your personal
          data is deleted from our database straight away, and drops out of our providers' routine
          backups as they expire. Pilot requests are deleted within 12 months if no pilot goes
          ahead. Aggregated results that cannot identify anyone may be kept.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <ul>
          <li>
            <strong className="text-ink">Access and download:</strong> download a copy of all your
            data from your{" "}
            <Link to="/account" className="text-accent hover:underline">
              account page
            </Link>{" "}
            at any time.
          </li>
          <li>
            <strong className="text-ink">Delete:</strong> delete your account and data from the same
            page. This cannot be undone.
          </li>
          <li>
            <strong className="text-ink">Correct:</strong> retake the assessment or audit, edit
            today's check-in, or email us to correct anything else.
          </li>
          <li>
            Under the PDPO you may also make a formal data access or correction request to{" "}
            {OPERATOR.email}. We will respond within 40 days.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          Data is encrypted in transit, and database rules ensure each person can only read their
          own records. Staff access to individual records is limited to the few people who need it
          to run and improve the service.
        </p>
      </LegalSection>

      <LegalSection title="10. Age">
        <p>The service is for people aged 18 and over.</p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          If we make a significant change to this policy we will tell you in the app before it takes
          effect. The date at the top shows when it last changed.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
