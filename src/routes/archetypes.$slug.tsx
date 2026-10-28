import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { ARCHETYPES, getArchetype, type Archetype } from "@/data/archetypes";

export const Route = createFileRoute("/archetypes/$slug")({
  loader: ({ params }) => {
    const archetype = getArchetype(params.slug);
    if (!archetype) throw notFound();
    return { archetype };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Archetype not found — The Cognitive Atelier" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const a = loaderData.archetype;
    const title = `${a.name} — ${a.tagline} | The Cognitive Atelier`;
    const desc = `${a.headline} Toxicity trigger: ${a.toxicityTrigger.label}. Burnout pattern: ${a.burnoutPattern.label}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  notFoundComponent: () => (
    <AppShell>
      <section className="container-page py-24 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Archetype not found</h1>
        <Link to="/archetypes" className="mt-6 inline-block text-accent hover:underline">
          Back to the atlas →
        </Link>
      </section>
    </AppShell>
  ),
  errorComponent: ({ reset }) => (
    <AppShell>
      <section className="container-page py-24 text-center">
        <h1 className="font-serif text-3xl font-bold">Something went wrong.</h1>
        <button onClick={reset} className="mt-4 rounded-full bg-ink px-5 py-2 text-sm text-paper">
          Retry
        </button>
      </section>
    </AppShell>
  ),
  component: ArchetypeDetail,
});

function ArchetypeDetail() {
  const { archetype } = Route.useLoaderData();
  const idx = ARCHETYPES.findIndex((a) => a.slug === archetype.slug);
  const prev = ARCHETYPES[(idx - 1 + ARCHETYPES.length) % ARCHETYPES.length];
  const next = ARCHETYPES[(idx + 1) % ARCHETYPES.length];

  return (
    <AppShell>
      <article className="container-page pt-14 pb-24 md:pt-20">
        <Link to="/archetypes" className="text-sm text-ink-muted hover:text-accent">
          ← All archetypes
        </Link>

        <header className="mt-8 grid gap-8 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="eyebrow">
              Archetype {String(idx + 1).padStart(2, "0")} of 10
            </p>
            <h1 className="mt-3 font-serif text-5xl font-bold leading-none md:text-7xl">
              {archetype.name}
            </h1>
            <p className="mt-4 font-serif text-2xl italic text-ink-soft">
              {archetype.tagline}
            </p>
            <p className="mt-4 max-w-2xl text-lg text-ink-soft">{archetype.headline}</p>
          </div>
          <div className="md:col-span-4 md:flex md:justify-end">
            <div
              className="card-paper flex h-40 w-40 items-center justify-center text-[5rem] leading-none"
              aria-hidden
            >
              {archetype.icon}
            </div>
          </div>
        </header>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <TraitList title="Strengths" tone="gold" items={archetype.strengths} />
          <TraitList title="Blind Spots" tone="accent" items={archetype.blindSpots} />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <TriggerCard
            label="Toxicity Trigger"
            headline={archetype.toxicityTrigger.label}
            items={archetype.toxicityTrigger.items}
          />
          <TriggerCard
            label="Burnout Pattern"
            headline={archetype.burnoutPattern.label}
            items={archetype.burnoutPattern.items}
          />
        </div>

        <section className="mt-10 card-paper p-8 md:p-12">
          <p className="eyebrow">Daily Prescription</p>
          <blockquote className="mt-4 font-serif text-2xl leading-snug md:text-3xl">
            “{archetype.prescription}”
          </blockquote>
        </section>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="card-paper p-8">
            <p className="eyebrow">Workplace Match</p>
            <ul className="mt-4 space-y-2 text-ink-soft">
              {archetype.workplaceMatch.map((w: string) => (
                <li key={w} className="flex gap-2">
                  <span className="text-accent">◆</span> {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-paper p-8">
            <p className="eyebrow">Evolution Path</p>
            <ul className="mt-4 space-y-2 text-ink-soft">
              {archetype.evolution.map((e: string) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>

        <nav className="mt-16 flex flex-col justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <Link
            to="/archetypes/$slug"
            params={{ slug: prev.slug }}
            className="group text-left"
          >
            <p className="eyebrow">Previous</p>
            <p className="mt-1 font-serif text-xl font-bold group-hover:text-accent">
              ← {prev.name}
            </p>
          </Link>
          <Link
            to="/archetypes/$slug"
            params={{ slug: next.slug }}
            className="group text-right"
          >
            <p className="eyebrow">Next</p>
            <p className="mt-1 font-serif text-xl font-bold group-hover:text-accent">
              {next.name} →
            </p>
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}

function TraitList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "gold" | "accent";
  items: Archetype["strengths"];
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ol className="mt-4 space-y-4">
        {items.map((it, i) => (
          <li key={it.title} className="border-l-2 pl-4" style={{ borderColor: tone === "gold" ? "var(--color-accent-gold)" : "var(--color-accent)" }}>
            <p className="font-serif text-lg font-bold">
              <span className="mr-2 font-mono text-xs text-ink-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              {it.title}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{it.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TriggerCard({
  label,
  headline,
  items,
}: {
  label: string;
  headline: string;
  items: string[];
}) {
  return (
    <div className="card-paper p-8">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-serif text-3xl font-bold uppercase tracking-tight">
        {headline}
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink-soft">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden>·</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
