import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { ArchetypeCard } from "@/components/site/ArchetypeCard";
import { ARCHETYPES } from "@/data/archetypes";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <Hero />
      <Philosophy />
      <ArchetypeGallery />
      <HowItWorks />
      <ClosingCTA />
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page pt-16 pb-20 md:pt-24 md:pb-28">
        <p className="eyebrow">A cognitive fitness studio · Est. 2026</p>
        <h1 className="mt-6 max-w-4xl font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          A psychological operating system for the way{" "}
          <span className="italic text-accent">you actually work.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
          Generic advice fails because humans are not generic. The Atelier maps you to one
          of twelve Cognitive Archetypes, audits your workplace toxicity, and delivers daily
          interventions engineered for your mind.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-lift transition-transform hover:scale-[1.02]"
          >
            Find my archetype
            <span aria-hidden>→</span>
          </Link>
          <Link
            to="/archetypes"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Meet all twelve
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            30 questions · 3 minutes
          </span>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            ["12", "Cognitive archetypes"],
            ["5", "Toxicity dimensions"],
            ["365", "Daily prescriptions"],
            ["∞", "Ways you are not generic"],
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

function Philosophy() {
  return (
    <section className="border-y border-border/60 bg-paper-dark/50">
      <div className="container-page grid gap-10 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="eyebrow">The Philosophy</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Cognitive individuation, not personalization.
          </h2>
        </div>
        <div className="md:col-span-8 md:col-start-6">
          <p className="text-lg text-ink-soft">
            A <em>Sentinel</em> in a chaotic startup needs different advice than a{" "}
            <em>Visionary</em> trapped in bureaucracy. A <em>Harmonizer</em> in a
            high-conflict team needs different interventions than a <em>Strategist</em> in
            a reactive culture.
          </p>
          <p className="mt-6 text-lg text-ink-soft">
            We understand your psychology. We understand your environment. We give you
            exactly what you need, when you need it.
          </p>
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
          <p className="eyebrow">The Ten Archetypes</p>
          <h2 className="mt-3 font-serif text-4xl font-bold md:text-5xl">
            Which one are you?
          </h2>
        </div>
        <Link
          to="/archetypes"
          className="text-sm font-medium text-accent hover:underline"
        >
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

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Discover your archetype",
      body: "A 12-question assessment maps you to one of twelve Cognitive Archetypes with a confidence score.",
    },
    {
      n: "02",
      title: "Audit your workplace",
      body: "Rate your environment across five toxicity dimensions. We identify what threatens your archetype most.",
    },
    {
      n: "03",
      title: "Receive daily interventions",
      body: "Every morning: one insight, one action, one warning — all tuned to who you are and where you work.",
    },
  ];
  return (
    <section className="border-t border-border/60 bg-paper-dark/40">
      <div className="container-page py-24">
        <p className="eyebrow">The Method</p>
        <h2 className="mt-3 max-w-2xl font-serif text-4xl font-bold md:text-5xl">
          From psychological profile to daily practice.
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="card-paper p-8">
              <p className="font-mono text-sm text-accent">{s.n}</p>
              <h3 className="mt-4 font-serif text-2xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="container-page py-24">
      <div className="card-paper flex flex-col items-start gap-6 p-10 md:flex-row md:items-center md:justify-between md:p-14">
        <div className="max-w-xl">
          <p className="eyebrow">Begin</p>
          <h2 className="mt-3 font-serif text-3xl font-bold md:text-4xl">
            Your archetype is waiting.
          </h2>
          <p className="mt-3 text-ink-soft">
            Three minutes. Thirty questions. A lifetime of psychological precision.
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
