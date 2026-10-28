import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/site/AppShell";
import { listResearch, RESEARCH_CATEGORIES } from "@/lib/research.functions";

export const Route = createFileRoute("/research/")({
  head: () => ({
    meta: [
      { title: "Research — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Neuroscience, behavioral psychology, editorials, and research papers underwriting the atelier's methods.",
      },
      { property: "og:title", content: "Research — The Cognitive Atelier" },
      {
        property: "og:description",
        content: "Neuroscience & behavioral psychology library.",
      },
    ],
  }),
  component: ResearchIndex,
});

function ResearchIndex() {
  const [cat, setCat] = useState<string | undefined>(undefined);
  const fetchList = useServerFn(listResearch);
  const { data, isLoading } = useQuery({
    queryKey: ["research", cat ?? "all"],
    queryFn: () => fetchList({ data: { category: cat } }),
  });

  return (
    <AppShell>
      <section className="container-page py-8 md:py-14">
        <div className="border-b-2 border-ink pb-6">
          <p className="eyebrow">The Library</p>
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Research & Editorials</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            The neuroscience and behavioral psychology underwriting the atelier's method — primary
            sources, editorials, and synthesis.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterPill active={!cat} onClick={() => setCat(undefined)} label="All" />
          {RESEARCH_CATEGORIES.map((c) => (
            <FilterPill
              key={c.slug}
              active={cat === c.slug}
              onClick={() => setCat(c.slug)}
              label={c.label}
            />
          ))}
        </div>

        {isLoading ? (
          <p className="mt-10 text-ink-muted">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="mt-10 text-ink-muted">Nothing published in this category yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data!.map((r) => (
              <Link
                key={r.id}
                to="/research/$slug"
                params={{ slug: r.slug }}
                className="card-paper group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                {r.hero_image_url && (
                  <div className="h-40 overflow-hidden bg-paper-dark">
                    <img
                      src={r.hero_image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6">
                  <p className="eyebrow">
                    {RESEARCH_CATEGORIES.find((c) => c.slug === r.category)?.label ?? r.category} ·{" "}
                    {r.read_minutes} min
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">{r.title}</h3>
                  {r.subtitle && (
                    <p className="mt-1 font-serif italic text-ink-soft">{r.subtitle}</p>
                  )}
                  <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{r.abstract}</p>
                  <p className="mt-4 text-xs font-mono uppercase tracking-widest text-ink-muted">
                    {r.authors ?? "—"} · {r.published_date}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-border bg-paper text-ink-soft hover:border-ink"
      }`}
    >
      {label}
    </button>
  );
}
