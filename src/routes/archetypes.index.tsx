import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { ArchetypeCard } from "@/components/site/ArchetypeCard";
import { ARCHETYPES } from "@/data/archetypes";

export const Route = createFileRoute("/archetypes/")({
  head: () => ({
    meta: [
      { title: "The Ten Cognitive Archetypes — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Meet the twelve Cognitive Archetypes: Sentinel, Visionary, Harmonizer, Perfectionist, Rebel, Anchor, Explorer, Guardian, Alchemist, Strategist, Catalyst, Sage.",
      },
      { property: "og:title", content: "The Ten Cognitive Archetypes" },
      {
        property: "og:description",
        content:
          "Ten psychological profiles — each with strengths, blind spots, toxicity triggers and daily interventions.",
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
          Ten archetypes. One of them is yours.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          Every archetype is a psychological blueprint: strengths, blind spots, the
          workplace conditions that destroy you, and the daily practice that keeps you
          whole.
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
