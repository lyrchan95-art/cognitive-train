import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Three tiers: Free, Premium, and Croft. Choose the depth of psychological individuation that fits your life.",
      },
      { property: "og:title", content: "Pricing — The Cognitive Atelier" },
      {
        property: "og:description",
        content: "Free, Premium, and Croft plans for personalized cognitive fitness.",
      },
    ],
  }),
  component: PricingPage,
});

const TIERS = [
  {
    name: "Free",
    price: "$0",
    tag: "Discover",
    features: [
      "Archetype quiz + full card",
      "Daily prescription (base)",
      "Access to the atlas",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "$12",
    tag: "Practice",
    features: [
      "Workplace toxicity audit",
      "Contextual daily interventions",
      "Streaks + reflections",
      "Shareable archetype card",
    ],
    cta: "Go Premium",
    highlighted: true,
  },
  {
    name: "Croft",
    price: "$29",
    tag: "Master",
    features: [
      "Everything in Premium",
      "AI-driven burnout prediction",
      "Deep-dive insights + interventions",
      "Priority support",
    ],
    cta: "Enter the Croft",
    highlighted: false,
  },
];

function PricingPage() {
  return (
    <AppShell>
      <section className="container-page pt-20 pb-8 md:pt-28">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">
          Choose the depth of your practice.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          Every plan starts with your archetype. Deeper plans unlock workplace context,
          predictive alerts, and long-form interventions.
        </p>
      </section>

      <section className="container-page grid gap-6 pb-24 pt-10 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`card-paper flex flex-col p-8 ${t.highlighted ? "ring-2 ring-accent" : ""}`}
          >
            <p className="eyebrow">{t.tag}</p>
            <h2 className="mt-3 font-serif text-3xl font-bold">{t.name}</h2>
            <p className="mt-4 font-serif text-5xl font-bold">
              {t.price}
              <span className="ml-1 text-base font-medium text-ink-muted">/mo</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">◆</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                to="/quiz"
                className={
                  t.highlighted
                    ? "inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground"
                    : "inline-flex w-full items-center justify-center rounded-full border border-ink px-5 py-3 text-sm font-semibold text-ink hover:bg-ink hover:text-paper"
                }
              >
                {t.cta}
              </Link>
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
