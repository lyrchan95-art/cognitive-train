import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/site/AppShell";
import { ArticleReaderModal } from "@/components/site/ArticleReaderModal";
import { getMyFeed, toggleArticleLike, type ArticleFeedItem } from "@/lib/articles.functions";
import { getArchetypeMeta } from "@/lib/quiz";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Your Feed — The Cognitive Atelier" },
      { name: "description", content: "Personalized articles for your archetype." },
    ],
  }),
  component: FeedPage,
});

type Mode = "feed" | "digest";

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function rotate<T>(arr: T[], offset: number): T[] {
  if (!arr.length) return arr;
  const k = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

function FeedPage() {
  const { user } = Route.useRouteContext();
  const fetchFeed = useServerFn(getMyFeed);
  const [mode, setMode] = useState<Mode>("feed");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshOffset, setRefreshOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["feed", user.id],
    queryFn: () => fetchFeed(),
  });

  const meta = data?.archetypeSlug ? getArchetypeMeta(data.archetypeSlug) : undefined;

  // Rotate the pool by day-of-year + manual refresh offset so digest changes daily
  // and the user can request a fresh selection on demand.
  const rotated = useMemo(() => {
    const pool = data?.articles ?? [];
    return rotate(pool, dayOfYear(new Date()) + refreshOffset);
  }, [data, refreshOffset]);

  // Daily Digest: first 3 of rotated pool. Full Feed: the remainder (no overlap).
  const digest = useMemo(() => rotated.slice(0, 3), [rotated]);
  const fullFeed = useMemo(() => rotated.slice(3), [rotated]);
  const digestIds = useMemo(() => new Set(digest.map((a) => a.id)), [digest]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  return (
    <AppShell>
      <section className="container-page py-8 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
          <div>
            <p className="eyebrow">The Atelier Daily</p>
            <h1 className="mt-1 font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {meta ? `Curated for ${meta.name}` : "Your Feed"}
            </h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
              {today}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRefreshOffset((v) => v + 1);
                setExpandedId(null);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition hover:bg-ink hover:text-paper"
              aria-label="Refresh daily selection"
            >
              <span aria-hidden>↻</span> Daily Refresh
            </button>
            <div className="flex gap-2 rounded-full border border-border bg-paper-dark/40 p-1">
              <TabBtn active={mode === "feed"} onClick={() => setMode("feed")}>
                Full Feed
              </TabBtn>
              <TabBtn active={mode === "digest"} onClick={() => setMode("digest")}>
                Daily Digest
              </TabBtn>
            </div>
          </div>
        </div>

        {!data?.archetypeSlug && (
          <div className="mt-6 card-paper p-6">
            <p className="text-ink-soft">
              Take the assessment to unlock a feed tailored to your cognitive signature.
            </p>
            <Link
              to="/quiz"
              className="mt-4 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              Start the quiz →
            </Link>
          </div>
        )}

        {isLoading ? (
          <p className="mt-8 text-ink-muted">Loading your feed…</p>
        ) : mode === "digest" ? (
          <DigestView articles={digest} meta={meta} userId={user.id} onOpen={setExpandedId} expandedId={expandedId} />
        ) : fullFeed.length === 0 ? (
          <p className="mt-8 text-ink-muted">No additional articles yet for this archetype.</p>
        ) : (
          <>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              {fullFeed.length} essays · today's digest hidden to avoid repeats
            </p>
            <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {fullFeed.filter((a) => !digestIds.has(a.id)).map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  userId={user.id}
                  expanded={expandedId === a.id}
                  onToggle={() => setExpandedId((v) => (v === a.id ? null : a.id))}
                />
              ))}
            </div>
          </>
        )}

      </section>
      <ArticleReaderModal
        article={data?.articles.find((a) => a.id === expandedId) ?? null}
        onClose={() => setExpandedId(null)}
      />
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition ${
        active ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function DigestView({
  articles,
  meta,
  userId,
  onOpen,
  expandedId,
}: {
  articles: ArticleFeedItem[];
  meta: ReturnType<typeof getArchetypeMeta>;
  userId: string;
  onOpen: (id: string | null) => void;
  expandedId: string | null;
}) {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="card-paper p-8">
          <p className="eyebrow">The Morning Read</p>
          <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">
            Three deliberate reads for the {meta?.name ?? "day"}.
          </h2>
          <p className="mt-3 text-ink-soft">
            A tight digest — chosen for your archetype, sized for one coffee. Tap any card to
            expand the full essay.
          </p>
          <ul className="mt-6 space-y-4">
            {articles.map((a, i) => (
              <li key={a.id} className="border-t border-border/60 pt-4">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-ink-muted">0{i + 1}</span>
                  <div className="flex-1">
                    <p className="eyebrow">{a.category}</p>
                    <button
                      onClick={() => onOpen(expandedId === a.id ? null : a.id)}
                      className="mt-1 text-left font-serif text-xl font-bold leading-snug hover:text-accent"
                    >
                      {a.title}
                    </button>
                    <p className="mt-1 text-sm text-ink-soft">{a.tldr ?? a.excerpt}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <aside className="space-y-4">
        {articles.map((a) => (
          <ArticleCard
            key={a.id}
            article={a}
            userId={userId}
            compact
            expanded={expandedId === a.id}
            onToggle={() => onOpen(expandedId === a.id ? null : a.id)}
          />
        ))}
      </aside>
    </div>
  );
}

function ArticleCard({
  article,
  userId,
  expanded,
  onToggle,
  compact,
}: {
  article: ArticleFeedItem;
  userId: string;
  expanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const toggle = useServerFn(toggleArticleLike);
  const mutation = useMutation({
    mutationFn: (liked: boolean) => toggle({ data: { articleId: article.id, liked } }),
    onMutate: async (liked) => {
      await qc.cancelQueries({ queryKey: ["feed", userId] });
      const prev = qc.getQueryData<{ archetypeSlug: string | null; articles: ArticleFeedItem[] }>([
        "feed",
        userId,
      ]);
      if (prev) {
        qc.setQueryData(["feed", userId], {
          ...prev,
          articles: prev.articles.map((x) => (x.id === article.id ? { ...x, liked } : x)),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed", userId], ctx.prev);
    },
  });

  return (
    <article
      className={`card-paper flex flex-col overflow-hidden transition-all ${
        expanded ? "ring-2 ring-accent" : ""
      }`}
    >
      {article.hero_image_url && !compact && (
        <button
          onClick={onToggle}
          className="relative block h-40 w-full overflow-hidden bg-paper-dark"
          aria-label="Open article"
        >
          <img
            src={article.hero_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        </button>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-ink-muted">
          <span>{article.category}</span>
          <span>{article.read_minutes} min read</span>
        </div>
        <button onClick={onToggle} className="mt-3 text-left">
          <h2 className="font-serif text-xl font-bold leading-tight hover:text-accent">
            {article.title}
          </h2>
        </button>
        <p className="mt-3 flex-1 text-sm text-ink-soft">{article.excerpt}</p>



        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 text-[10px] font-mono uppercase tracking-widest text-ink-muted">
            {article.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full border border-border px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-ink hover:text-ink"
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => mutation.mutate(!article.liked)}
              aria-pressed={article.liked}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                article.liked
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              <span aria-hidden>{article.liked ? "♥" : "♡"}</span>
              {article.liked ? "Liked" : "Like"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
