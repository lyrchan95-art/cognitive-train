import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/site/LegalPage";
import { SUPPORT_LINES } from "@/lib/legal";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Get Support — The Cognitive Atelier" },
      {
        name: "description",
        content: "24-hour mental health and crisis helplines in Hong Kong.",
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <LegalPage
      eyebrow="Support"
      title="If you're struggling, talk to someone."
      showDraftNotice={false}
      intro={
        <p>
          The Cognitive Atelier can flag rising strain, but it is not a crisis or medical service.
          These Hong Kong lines are free and confidential.
        </p>
      }
    >
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {SUPPORT_LINES.map((l) => (
          <li key={l.number} className="card-paper p-6">
            <p className="font-serif text-lg font-bold">{l.name}</p>
            <a
              href={`tel:${l.number.replace(/\s/g, "")}`}
              className="mt-2 block font-serif text-3xl font-bold text-accent hover:underline"
            >
              {l.number}
            </a>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              {l.hours}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{l.note}</p>
          </li>
        ))}
      </ul>

      <LegalSection title="Burnout at work">
        <p>
          If your risk score stays high, consider talking to your manager or HR about workload, and
          to your doctor about how you're feeling. Your employer cannot see your score.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
