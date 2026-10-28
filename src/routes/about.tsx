import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Philosophy — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "The Cognitive Atelier is a psychological operating system. We believe generic advice fails because humans are not generic.",
      },
      { property: "og:title", content: "Our Philosophy — The Cognitive Atelier" },
      {
        property: "og:description",
        content:
          "Cognitive individuation: mapping psychology to daily reality, and delivering interventions that actually work.",
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
              The Cognitive Atelier is a proprietary system that maps users to ten
              distinct Cognitive Archetypes and delivers daily personalized insights,
              actions, and workplace toxicity warnings.
            </p>
            <p>
              Where competitors deliver generic content, we deliver a psychological
              operating system that understands <em>who you are</em>, <em>where you work</em>,{" "}
              <em>how you respond to stress</em>, and <em>what you need daily</em>.
            </p>
            <p className="font-serif text-2xl italic text-ink">
              “This is not personalization. It is cognitive individuation — the
              process of mapping psychology to daily reality, and delivering interventions
              that actually work.”
            </p>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-4">
          {[
            { n: "01", t: "Discovery", d: "Archetype assignment via quiz." },
            { n: "02", t: "Prescription", d: "Daily practices tuned to your archetype." },
            { n: "03", t: "Context", d: "Interventions shaped by your workplace audit." },
            { n: "04", t: "Prediction", d: "AI-driven alerts before burnout hits." },
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
