import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/site/LegalPage";
import { OPERATOR, TEAM_PRICE_HKD_PER_SEAT } from "@/lib/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "The terms for using The Cognitive Atelier, including team pilots, pricing and what the service is not.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between you and {OPERATOR.name}, who operates The Cognitive
          Atelier. By creating an account or running a team pilot you agree to them. Please also
          read our{" "}
          <Link to="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <LegalSection title="1. Not medical advice">
        <p>
          The Cognitive Atelier is a wellbeing and self-reflection tool. Archetypes, risk scores and
          briefings are not a medical or psychological diagnosis, and are not a substitute for
          professional care. If you are struggling, please speak to a doctor or counsellor. In an
          emergency call 999, or see our{" "}
          <Link to="/support" className="text-accent hover:underline">
            support page
          </Link>{" "}
          for 24-hour helplines.
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use it">
        <p>
          You must be 18 or over. Keep your login details secure; you are responsible for activity
          on your account.
        </p>
      </LegalSection>

      <LegalSection title="3. Beta service">
        <p>
          The service is in beta. Features may change, and we may suspend or end the service with
          reasonable notice. Individual accounts are free.
        </p>
      </LegalSection>

      <LegalSection title="4. Team pilots and fees">
        <ul>
          <li>A team pilot is free for 6 weeks and carries no obligation to buy.</li>
          <li>
            After a pilot, teams that continue pay HK${TEAM_PRICE_HKD_PER_SEAT} per participating
            person per month, invoiced monthly in advance unless agreed otherwise in writing.
          </li>
          <li>Either side can end a team subscription at the end of any monthly period.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Rules for employers">
        <p>An organisation running a pilot or subscription agrees that it will not:</p>
        <ul>
          <li>require anyone to take part, or penalise anyone who declines;</li>
          <li>try to identify individuals from team reports; or</li>
          <li>
            use any output of the service in hiring, performance, promotion or disciplinary
            decisions.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>
          Don't misuse the service: no attempts to access other people's data, disrupt the platform,
          scrape content, or use it for anything unlawful.
        </p>
      </LegalSection>

      <LegalSection title="7. Your content and ours">
        <p>
          You own what you write. You let us store and process it to provide the service, as
          described in the Privacy Policy. The site's text, archetypes, methods and design belong to
          us.
        </p>
      </LegalSection>

      <LegalSection title="8. Liability">
        <p>
          The service is provided "as is". To the extent the law allows, we are not liable for
          decisions you or your organisation make based on it, or for indirect losses. Nothing in
          these terms limits liability that cannot be limited under Hong Kong law.
        </p>
      </LegalSection>

      <LegalSection title="9. Ending your account">
        <p>
          You can delete your account at any time from your{" "}
          <Link to="/account" className="text-accent hover:underline">
            account page
          </Link>
          . We may suspend accounts that break these terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Law">
        <p>
          These terms are governed by the laws of the Hong Kong SAR, whose courts have jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about these terms: <strong className="text-ink">{OPERATOR.email}</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
