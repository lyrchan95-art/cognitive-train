import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { TEAM_PRICE_HKD_PER_SEAT } from "@/lib/legal";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Free for individuals during beta. Hong Kong teams can run a free 6-week pilot with aggregate team reports.",
      },
      { property: "og:title", content: "Pricing — The Cognitive Atelier" },
      {
        property: "og:description",
        content: "Free for individuals during beta, and a free 6-week pilot for teams.",
      },
    ],
  }),
  component: PricingPage,
});

const TIERS = [
  {
    name: "Individual",
    price: "Free",
    note: "for individuals",
    after: "No card needed.",
    tag: "For you",
    features: [
      "30-question work-style assessment and archetype profile",
      "30-second daily check-in and burnout-risk score",
      "Workplace audit across five dimensions",
      "Daily briefing and action tuned to your archetype",
      "Reading feed and learning pathways",
    ],
    cta: { to: "/quiz", label: "Take the assessment" },
    highlighted: false,
  },
  {
    name: "Team",
    price: `HK$${TEAM_PRICE_HKD_PER_SEAT}`,
    note: "per person / month",
    after: "Starts with a free 6-week pilot. Cancel any month.",
    tag: "For Hong Kong teams of 20–200",
    features: [
      "Everything in Individual, for every team member",
      "Set-up session with our founding team",
      "Weekly team report, in aggregate only — never individual answers",
      "Groups smaller than five people are never reported on",
      "Invoiced monthly in HKD",
    ],
    cta: { to: "/teams", label: "Request a pilot" },
    highlighted: true,
  },
];

function PricingPage() {
  return (
    <AppShell>
      <section className="container-page pt-20 pb-8 md:pt-28">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">
          Free for individuals. Simple for teams.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          Every individual feature is free. Teams start with a free 6-week pilot, then pay HK$
          {TEAM_PRICE_HKD_PER_SEAT} per person per month — a 50-person team is HK$
          {(TEAM_PRICE_HKD_PER_SEAT * 50).toLocaleString("en-HK")} a month.
        </p>
      </section>

      <section className="container-page grid gap-6 pb-24 pt-10 md:grid-cols-2">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`card-paper flex flex-col p-8 ${t.highlighted ? "ring-2 ring-accent" : ""}`}
          >
            <p className="eyebrow">{t.tag}</p>
            <h2 className="mt-3 font-serif text-3xl font-bold">{t.name}</h2>
            <p className="mt-4 font-serif text-5xl font-bold">
              {t.price}
              <span className="ml-2 text-base font-medium text-ink-muted">{t.note}</span>
            </p>
            <p className="mt-2 text-sm text-ink-muted">{t.after}</p>
            <ul className="mt-6 space-y-3 text-sm text-ink-soft">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">◆</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <Link
                to={t.cta.to}
                className={
                  t.highlighted
                    ? "inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground"
                    : "inline-flex w-full items-center justify-center rounded-full border border-ink px-5 py-3 text-sm font-semibold text-ink hover:bg-ink hover:text-paper"
                }
              >
                {t.cta.label}
              </Link>
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
