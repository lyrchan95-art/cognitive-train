import { Link } from "@tanstack/react-router";
import type { Archetype } from "@/data/archetypes";

export function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  return (
    <Link
      to="/archetypes/$slug"
      params={{ slug: archetype.slug }}
      className="group card-paper deckle-edge relative flex flex-col overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <div className="text-4xl leading-none" aria-hidden>
          {archetype.icon}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {String(archetype.slug).toUpperCase()}
        </span>
      </div>

      <h3 className="mt-6 font-serif text-2xl font-bold">{archetype.name}</h3>
      <p className="mt-1 text-sm italic text-ink-muted">{archetype.tagline}</p>

      <p className="mt-4 text-sm text-ink-soft">{archetype.headline}</p>

      <div className="mt-6 rule" />

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="eyebrow">Trigger</dt>
          <dd className="mt-1 font-medium text-ink">{archetype.toxicityTrigger.label}</dd>
        </div>
        <div>
          <dt className="eyebrow">Burnout</dt>
          <dd className="mt-1 font-medium text-ink">{archetype.burnoutPattern.label}</dd>
        </div>
      </dl>

      <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent">
        Read the card
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
