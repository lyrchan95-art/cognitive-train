import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Philosophy — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "The Cognitive Atelier is a burnout early-warning tool for people and teams in Hong Kong. Generic advice fails because people burn out in different ways.",
      },
      { property: "og:title", content: "Our Philosophy — The Cognitive Atelier" },
      {
        property: "og:description",
        content:
          "Who you are, where you work, and how you are doing today — combined into an early, explainable burnout warning.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell>
      <article className="container-page pt-20 pb-24 md:pt-28">
        <p className="eyebrow">Our Philosophy</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl font-bold leading-tight md:text-7xl">
          Generic advice fails because humans are not generic.
        </h1>

        <div className="mt-14 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7 md:col-start-2 space-y-6 text-lg text-ink-soft">
            <p>
              The Cognitive Atelier is a burnout early-warning tool for people and teams
              in Hong Kong. It maps each person to one of twelve work archetypes, audits
              their workplace, and turns a 30-second daily check-in into a burnout-risk
              score that explains what is driving it.
            </p>
            <p>
              Most wellbeing tools treat everyone the same. We combine{" "}
              <em>who you are</em>, <em>where you work</em> and <em>how you are doing today</em>,
              because the same pressure breaks different people in different ways.
            </p>
            <p className="font-serif text-2xl italic text-ink">
              “The warning should come weeks before the resignation letter — and the
              advice should fit the person.”
            </p>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-4">
          {[
            { n: "01", t: "Assess", d: "A 30-question assessment assigns your work archetype." },
            { n: "02", t: "Audit", d: "Five workplace dimensions, rated by you." },
            { n: "03", t: "Check in", d: "Thirty seconds a day: energy, stress, workload, control." },
            { n: "04", t: "Act early", d: "An explainable risk score and a daily action that fits you." },
          ].map((s) => (
            <div key={s.n} className="card-paper p-6">
              <p className="font-mono text-sm text-accent">{s.n}</p>
              <p className="mt-3 font-serif text-xl font-bold">{s.t}</p>
              <p className="mt-2 text-sm text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
      </article>
    </AppShell>
  );
}
