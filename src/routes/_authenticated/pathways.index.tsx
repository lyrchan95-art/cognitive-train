import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/site/AppShell";
import { myPathways, type PathwaySummary } from "@/lib/pathways.functions";
import { getArchetypeMeta, nemesisArchetypes } from "@/lib/quiz";

export const Route = createFileRoute("/_authenticated/pathways/")({
  head: () => ({
    meta: [
      { title: "Learning Pathways — The Cognitive Atelier" },
      {
        name: "description",
        content: "7-day archetype-specific learning journeys with daily actions and progress tracking.",
      },
    ],
  }),
  component: PathwaysPage,
});

function PathwaysPage() {
  const { user } = Route.useRouteContext();
  const fetchList = useServerFn(myPathways);
  const { data, isLoading } = useQuery({
    queryKey: ["pathways", user.id],
    queryFn: () => fetchList(),
  });

  return (
    <AppShell>
      <section className="container-page py-8 md:py-14">
        <div className="border-b-2 border-ink pb-6">
          <p className="eyebrow">Active Learning</p>
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">Learning Pathways</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Three stages. Master your own archetype, then study the profiles that oppose you, then
            learn how the rest of your team actually thinks.
          </p>
        </div>

        {isLoading ? (
          <p className="mt-10 text-ink-muted">Loading pathways…</p>
        ) : (
          (() => {
            const everything = data?.pathways ?? [];
            const mineSlug = data?.myArchetype ?? null;
            const streak = data?.currentStreak ?? 0;
            const programs = everything.filter(
              (p) => p.required_streak > 0 && (!mineSlug || p.archetype_slug === mineSlug),
            );
            const all = everything.filter((p) => p.required_streak === 0);
            const nemeses = mineSlug ? nemesisArchetypes(mineSlug, 3) : [];
            const mine = all.filter((p) => p.archetype_slug === mineSlug);
            const nemesis = all.filter((p) => nemeses.includes(p.archetype_slug));
            const team = all.filter(
              (p) => p.archetype_slug !== mineSlug && !nemeses.includes(p.archetype_slug),
            );

            const groups: { key: string; eyebrow: string; title: string; blurb: string; items: PathwaySummary[] }[] = [
              {
                key: "mine",
                eyebrow: "Step 01 · Master yourself",
                title: "Your Archetype",
                blurb: mineSlug
                  ? "Written for how you actually work. Start here — depth before breadth."
                  : "Take the assessment to unlock the pathway written for your archetype.",
                items: mine,
              },
              {
                key: "nemesis",
                eyebrow: "Step 02 · Know your nemesis",
                title: "Know Your Nemesis",
                blurb:
                  "These profiles sit furthest from your psychological signature — the people most likely to trigger friction. Study them and the friction becomes information.",
                items: nemesis,
              },
              {
                key: "team",
                eyebrow: "Step 03 · Read the room",
                title: "Learn What Your Team Thinks",
                blurb:
                  "The remaining archetypes on your team. Understanding their defaults makes you legible to them — and them predictable to you.",
                items: team,
              },
            ];
            return (
              <div className="mt-12 space-y-16">
                {programs.length > 0 && (
                  <div>
                    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                      <div>
                        <p className="eyebrow">Flagship Program · 6 weeks</p>
                        <h2 className="mt-1 font-serif text-3xl font-bold">Signature Programs</h2>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                        Streak {streak}/14
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-ink-soft">
                      Stop treating symptoms. Fix the root cause. Long-form protocols that unlock
                      once you have built a 14-day daily streak — or with Premium.
                    </p>
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      {programs.map((p) => (
                        <ProgramCard key={p.id} p={p} streak={streak} />
                      ))}
                    </div>
                  </div>
                )}
                {groups.map((g) => (

                  <div key={g.key}>
                    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                      <div>
                        <p className="eyebrow">{g.eyebrow}</p>
                        <h2 className="mt-1 font-serif text-3xl font-bold">{g.title}</h2>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                        {g.items.length} {g.items.length === 1 ? "pathway" : "pathways"}
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-ink-soft">{g.blurb}</p>
                    {g.items.length === 0 ? (
                      <div className="mt-6 rounded-md border border-dashed border-border p-6 text-sm text-ink-muted">
                        {g.key === "mine" ? (
                          <>
                            No archetype on file yet.{" "}
                            <Link to="/quiz" className="underline">
                              Take the assessment
                            </Link>{" "}
                            to unlock this section.
                          </>
                        ) : (
                          "Nothing here yet."
                        )}
                      </div>
                    ) : (
                      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {g.items.map((p) => (
                          <PathwayCard
                            key={p.id}
                            p={p}
                            mine={g.key === "mine"}
                            badge={
                              g.key === "nemesis"
                                ? "Nemesis"
                                : g.key === "team"
                                  ? "Team"
                                  : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </section>
    </AppShell>
  );
}

function PathwayCard({
  p,
  mine,
  badge,
}: {
  p: PathwaySummary;
  mine: boolean;
  badge?: string;
}) {
  const meta = getArchetypeMeta(p.archetype_slug);
  const pct = Math.round(((p.completed_days ?? 0) / p.duration_days) * 100);
  return (
    <Link
      to="/pathways/$slug"
      params={{ slug: p.slug }}
      className="card-paper group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      {p.hero_image_url && (
        <div className="relative h-40 overflow-hidden bg-paper-dark">
          <img
            src={p.hero_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {(mine || badge) && (
            <span
              className={`absolute left-3 top-3 rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                mine ? "bg-accent text-accent-foreground" : "bg-ink text-paper"
              }`}
            >
              {mine ? "For You" : badge}
            </span>
          )}
        </div>
      )}
      <div className="p-6">
        <p className="eyebrow">
          {meta?.name ?? p.archetype_slug} · {p.difficulty}
        </p>
        <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">{p.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.description}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-ink-muted">
            <span>
              {p.completed_days ?? 0} / {p.duration_days} days
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-paper-dark">
            <div
              className="h-1.5 rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProgramCard({ p, streak }: { p: PathwaySummary; streak: number }) {
  const locked = streak < p.required_streak;
  const done = p.completed_days ?? 0;
  const pct = Math.round((done / p.duration_days) * 100);
  const body = (
    <>
      {p.hero_image_url && (
        <div className="relative h-44 overflow-hidden bg-paper-dark">
          <img
            src={p.hero_image_url}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${locked ? "grayscale" : ""}`}
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-paper">
            {locked ? `🔒 Unlocks at ${p.required_streak}-day streak` : "Flagship · 6 weeks"}
          </span>
        </div>
      )}
      <div className="p-6">
        <p className="eyebrow">Stop treating symptoms. Fix the root cause.</p>
        <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">{p.title}</h3>
        <p className="mt-2 text-sm text-ink-soft">{p.description}</p>
        {p.certificate_title && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
            🎖 Certificate: {p.certificate_title}
          </p>
        )}
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-ink-muted">
            <span>
              {done} / {p.duration_days} weeks
            </span>
            <span>{locked ? `${streak}/${p.required_streak} streak` : `${pct}%`}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-paper-dark">
            <div
              className="h-1.5 rounded-full bg-accent transition-all"
              style={{ width: `${locked ? Math.min(100, (streak / p.required_streak) * 100) : pct}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
  if (locked) {
    return (
      <div className="card-paper group overflow-hidden opacity-70" aria-disabled>
        {body}
      </div>
    );
  }
  return (
    <Link
      to="/pathways/$slug"
      params={{ slug: p.slug }}
      className="card-paper group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      {body}
    </Link>
  );
}
