import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { ArchetypeCard } from "@/components/site/ArchetypeCard";
import { ARCHETYPES } from "@/data/archetypes";

export const Route = createFileRoute("/archetypes/")({
  head: () => ({
    meta: [
      { title: "The Twelve Work Archetypes — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Meet the twelve Cognitive Archetypes: Sentinel, Visionary, Harmonizer, Perfectionist, Rebel, Anchor, Explorer, Guardian, Alchemist, Strategist, Catalyst, Sage.",
      },
      { property: "og:title", content: "The Twelve Work Archetypes" },
      {
        property: "og:description",
        content:
          "Twelve work archetypes — each with strengths, blind spots, burnout triggers and daily practices.",
      },
    ],
  }),
  component: ArchetypesIndex,
});

function ArchetypesIndex() {
  return (
    <AppShell>
      <section className="container-page pt-16 pb-8 md:pt-24">
        <p className="eyebrow">The Atlas</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">
          Twelve archetypes. One of them is yours.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          Every archetype describes a way of working: strengths, blind spots, the
          workplace conditions most likely to burn you out, and the daily practice that
          keeps you steady.
        </p>
      </section>

      <section className="container-page pb-24">
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ARCHETYPES.map((a) => (
            <ArchetypeCard key={a.slug} archetype={a} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
