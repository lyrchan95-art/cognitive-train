import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { ArchetypeCard } from "@/components/site/ArchetypeCard";
import { ARCHETYPES } from "@/data/archetypes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Cognitive Atelier — Burnout early-warning for Hong Kong teams" },
      {
        name: "description",
        content:
          "See burnout coming before it costs you your best people. A 3-minute assessment, a 30-second daily check-in, and a risk score that explains what's driving it.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <Hero />
      <Problem />
      <HowItWorks />
      <ForTeams />
      <ArchetypeGallery />
      <ClosingCTA />
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="eyebrow">Burnout early-warning for Hong Kong teams</p>
        <h1 className="mt-6 max-w-4xl font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          See burnout coming —{" "}
          <span className="italic text-accent">before it costs you your best people.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
          A 3-minute assessment maps how each person works. A 30-second daily check-in tracks
          strain. A risk score explains what's driving it — and what to do next.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-lift transition-transform hover:scale-[1.02]"
          >
            Take the free assessment
            <span aria-hidden>→</span>
          </Link>
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Run a team pilot
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            30 questions · 3 minutes
          </span>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            ["30", "Assessment questions"],
            ["12", "Work archetypes"],
            ["5", "Workplace dimensions audited"],
            ["30s", "Daily check-in"],
          ].map(([n, l]) => (
            <div key={l} className="border-l border-border-strong pl-4">
              <p className="font-serif text-3xl font-bold text-ink">{n}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-ink-muted">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-y border-border/60 bg-paper-dark/50">
      <div className="container-page grid gap-10 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="eyebrow">The problem</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Burnout is visible weeks before the resignation letter.
          </h2>
        </div>
        <div className="md:col-span-8 md:col-start-6">
          <p className="text-lg text-ink-soft">
            Long hours and high pressure are normal in Hong Kong offices. By the time a manager
            notices someone is burning out, they are often already looking for the exit. Annual
            engagement surveys arrive too late, and generic wellness apps treat everyone the same.
          </p>
          <p className="mt-6 text-lg text-ink-soft">
            But people don't break the same way. A <em>Sentinel</em> breaks when they lose control
            of how work happens; a <em>Harmonizer</em> breaks under sustained conflict. The Atelier
            combines who you are, where you work and how you're doing today — so the warning is
            early, and the advice fits.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Assess",
      body: "A 30-question assessment across six dimensions maps you to one of twelve work archetypes, with a confidence score.",
    },
    {
      n: "02",
      title: "Audit",
      body: "Rate your workplace on autonomy, psychological safety, workload, recognition and purpose.",
    },
    {
      n: "03",
      title: "Check in",
      body: "Thirty seconds a day: energy, stress, workload and sense of control.",
    },
    {
      n: "04",
      title: "Act early",
      body: "A burnout-risk score that names its drivers, plus a daily briefing and action tuned to your archetype.",
    },
  ];
  return (
    <section className="container-page py-24">
      <p className="eyebrow">How it works</p>
      <h2 className="mt-3 max-w-2xl font-serif text-4xl font-bold md:text-5xl">
        From profile to early warning.
      </h2>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="card-paper p-8">
            <p className="font-mono text-sm text-accent">{s.n}</p>
            <h3 className="mt-4 font-serif text-2xl font-bold">{s.title}</h3>
            <p className="mt-3 text-sm text-ink-soft">{s.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        Every weight in the risk score is published.{" "}
        <Link to="/methodology" className="font-medium text-accent hover:underline">
          Read the methodology →
        </Link>
      </p>
    </section>
  );
}

function ForTeams() {
  return (
    <section className="border-y border-border/60 bg-paper-dark/40">
      <div className="container-page grid gap-10 py-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow">For teams</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Built for Hong Kong SMEs and startups of 20–200 people.
          </h2>
        </div>
        <div className="md:col-span-6 md:col-start-7">
          <ul className="space-y-3 text-ink-soft">
            {[
              "A free 6-week pilot, set up with you by our founding team.",
              "Weekly team reports in aggregate only — never individual answers.",
              "Early signals on where workload, safety or recognition is slipping.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="text-accent">◆</span>
                {t}
              </li>
            ))}
          </ul>
          <Link
            to="/teams"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:opacity-90"
          >
            Request a pilot
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ArchetypeGallery() {
  return (
    <section className="container-page py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">The Twelve Archetypes</p>
          <h2 className="mt-3 font-serif text-4xl font-bold md:text-5xl">Which one are you?</h2>
        </div>
        <Link to="/archetypes" className="text-sm font-medium text-accent hover:underline">
          View the full atlas →
        </Link>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ARCHETYPES.map((a) => (
          <ArchetypeCard key={a.slug} archetype={a} />
        ))}
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="container-page pb-24">
      <div className="card-paper flex flex-col items-start gap-6 p-10 md:flex-row md:items-center md:justify-between md:p-14">
        <div className="max-w-xl">
          <p className="eyebrow">Begin</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Start with your own signal.
          </h2>
          <p className="mt-3 text-ink-soft">
            Three minutes, thirty questions, free. Then a 30-second check-in each day.
          </p>
        </div>
        <Link
          to="/quiz"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lift transition-transform hover:scale-[1.02]"
        >
          Start the assessment
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
