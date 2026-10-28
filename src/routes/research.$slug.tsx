import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/site/AppShell";
import { getResearchBySlug, RESEARCH_CATEGORIES } from "@/lib/research.functions";

export const Route = createFileRoute("/research/$slug")({
  loader: async ({ params }) => {
    try {
      return await getResearchBySlug({ data: { slug: params.slug } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    }
    return {
      meta: [
        { title: `${loaderData.title} — Research` },
        { name: "description", content: loaderData.abstract.slice(0, 160) },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.abstract.slice(0, 200) },
        ...(loaderData.hero_image_url
          ? [{ property: "og:image", content: loaderData.hero_image_url }]
          : []),
      ],
    };
  },
  component: ResearchDetail,
});

function ResearchDetail() {
  const r = Route.useLoaderData();
  const catLabel =
    RESEARCH_CATEGORIES.find((c) => c.slug === r.category)?.label ?? r.category;

  return (
    <AppShell>
      <article className="container-page py-12">
        <Link to="/research" className="text-sm text-ink-muted hover:text-accent">
          ← Back to Research
        </Link>
        <header className="mt-4 border-b-2 border-ink pb-8">
          <p className="eyebrow">
            {catLabel} · {r.read_minutes} min · {r.published_date}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold md:text-5xl">{r.title}</h1>
          {r.subtitle && (
            <p className="mt-3 font-serif text-xl italic text-ink-soft">{r.subtitle}</p>
          )}
          {r.authors && (
            <p className="mt-3 text-sm font-mono uppercase tracking-widest text-ink-muted">
              {r.authors}
            </p>
          )}
        </header>

        {r.hero_image_url && (
          <img
            src={r.hero_image_url}
            alt=""
            className="mt-8 h-72 w-full rounded-lg object-cover shadow-paper md:h-96"
          />
        )}

        <section className="mt-10 rounded-2xl border border-border bg-paper-dark/30 p-6">
          <p className="eyebrow">Abstract</p>
          <p className="mt-2 text-lg leading-relaxed text-ink">{r.abstract}</p>
        </section>

        <div className="prose prose-lg mt-10 max-w-none whitespace-pre-line text-ink">
          {r.body}
        </div>

        {(r.citation || r.source_url) && (
          <footer className="mt-12 border-t border-border pt-6 text-sm text-ink-muted">
            {r.citation && <p className="font-mono">{r.citation}</p>}
            {r.source_url && (
              <a
                href={r.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-accent hover:underline"
              >
                Source ↗
              </a>
            )}
          </footer>
        )}
      </article>
    </AppShell>
  );
}
