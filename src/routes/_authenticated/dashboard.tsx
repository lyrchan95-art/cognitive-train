import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/site/AppShell";
import { ArticleReaderModal } from "@/components/site/ArticleReaderModal";
import { getMyArchetype } from "@/lib/user-archetype.functions";
import { getArchetypeMeta, archetypeSignature } from "@/lib/quiz";
import { ArchetypeRadar } from "@/components/site/ArchetypeRadar";
import { supabase } from "@/integrations/supabase/client";
import { ARCHETYPES } from "@/data/archetypes";
import { getAdminStatus, adminPreviewArchetype } from "@/lib/admin.functions";
import {
  completeDailyAction,
  getMyStreak,
  getTodaysBriefing,
  markBriefingRead,
  submitReflection,
} from "@/lib/briefing.functions";
import {
  getMyFeed,
  toggleArticleLike,
  type ArticleFeedItem,
} from "@/lib/articles.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Atelier — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Your daily feed, workplace audit, and archetype profile — all in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchArchetype = useServerFn(getMyArchetype);
  const fetchStreak = useServerFn(getMyStreak);
  const fetchBriefing = useServerFn(getTodaysBriefing);
  const fetchFeed = useServerFn(getMyFeed);
  const markRead = useServerFn(markBriefingRead);
  const completeAction = useServerFn(completeDailyAction);
  const sendReflection = useServerFn(submitReflection);
  const fetchAdminStatus = useServerFn(getAdminStatus);
  const previewArchetype = useServerFn(adminPreviewArchetype);

  const { data: adminStatus } = useQuery({
    queryKey: ["admin-status", user.id],
    queryFn: () => fetchAdminStatus(),
    retry: false,
  });
  const previewMutation = useMutation({
    mutationFn: (slug: string) => previewArchetype({ data: { slug } }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("Test profile switched", {
        description: "Feed, briefing and profile now reflect the selected archetype.",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: archetypeRow } = useQuery({
    queryKey: ["my-archetype", user.id],
    queryFn: () => fetchArchetype(),
  });
  const { data: streak } = useQuery({
    queryKey: ["streak", user.id],
    queryFn: () => fetchStreak(),
  });
  const { data: briefing } = useQuery({
    queryKey: ["briefing", user.id],
    queryFn: () => fetchBriefing(),
    enabled: !!archetypeRow,
    retry: false,
  });
  const { data: feed, isLoading: feedLoading } = useQuery({
    queryKey: ["feed", user.id],
    queryFn: () => fetchFeed(),
  });

  const readMutation = useMutation({
    mutationFn: () => markRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streak", user.id] });
      qc.invalidateQueries({ queryKey: ["briefing", user.id] });
      toast.success("Trigger acknowledged", {
        description: "Your Daily Prescription is now unlocked.",
      });
    },
  });
  const actionMutation = useMutation({
    mutationFn: () => completeAction(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefing", user.id] });
      toast.success("Prescription completed", {
        description: "Evening Reflection unlocks tonight — return to close the loop.",
      });
    },
  });
  const reflectionMutation = useMutation({
    mutationFn: (reflection: string) => sendReflection({ data: { reflection } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefing", user.id] });
      toast.success("Loop closed", { description: "The Atelier has logged today's growth." });
    },
  });

  // Notification module: surface today's Morning Trigger as a toast once per day.
  const alertedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!briefing?.toxicity_alert) return;
    if (briefing.read_at) return;
    const key = `atelier-alert-${briefing.briefing_date}`;
    if (alertedRef.current === key) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) return;
    alertedRef.current = key;
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
    toast("Morning Briefing", {
      description: briefing.toxicity_alert,
      duration: 8000,
    });
  }, [briefing?.toxicity_alert, briefing?.read_at, briefing?.briefing_date]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const meta = archetypeRow ? getArchetypeMeta(archetypeRow.archetype_slug) : undefined;
  const mosaic = useMemo(() => (feed?.articles ?? []).slice(0, 7), [feed]);

  // Derive habit progress from briefing read state (1/3 sample: quiz done, briefing read, audit done)
  const habits = [
    { key: "archetype", done: !!archetypeRow, label: "Archetype claimed" },
    { key: "briefing", done: !!briefing?.read_at, label: "Daily briefing read" },
    { key: "audit", done: false, label: "Workplace audit today" },
  ];
  const habitDone = habits.filter((h) => h.done).length;
  const habitPct = Math.round((habitDone / habits.length) * 100);

  const dims = (archetypeRow?.dimension_scores as Record<string, number> | null) ?? null;
  const skillRows = dims
    ? [
        { label: "Strategic Vision", value: Math.round(((dims.O ?? 0) * 0.6 + (dims.C ?? 0) * 0.4) * 100) },
        { label: "Systems Thinking", value: Math.round((dims.C ?? 0) * 100) },
        { label: "Environmental Sense", value: Math.round((dims.S ?? 0) * 100) },
        { label: "Emotional Steadiness", value: Math.round((1 - (dims.N ?? 0)) * 100) },
      ]
    : [];

  return (
    <AppShell>
      <section className="container-page py-10 md:py-14">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
          <div>
            <p className="eyebrow">Your Atelier</p>
            <h1 className="mt-1 font-serif text-3xl font-bold leading-tight md:text-4xl">
              Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-ink-soft hover:bg-ink hover:text-paper"
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
          {/* MAIN */}
          <div className="min-w-0 space-y-6">
            {/* Daily Feed mosaic */}
            <div className="card-paper p-6 md:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-4">
                <h2 className="font-serif text-2xl font-bold">Daily Feed</h2>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                  {meta ? `Curated for ${meta.name}` : "Take the quiz to personalize"}
                </span>
              </div>

              {feedLoading ? (
                <p className="mt-6 text-ink-muted">Loading your feed…</p>
              ) : mosaic.length === 0 ? (
                <div className="mt-6">
                  <p className="text-ink-soft">
                    Your feed unlocks once you take the assessment.
                  </p>
                  <Link
                    to="/quiz"
                    className="mt-4 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
                  >
                    Start the quiz →
                  </Link>
                </div>
              ) : (
                <>
                  <MosaicGrid articles={mosaic} userId={user.id} briefing={briefing} />
                  <div className="mt-6 flex justify-end">
                    <Link
                      to="/feed"
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Open full feed →
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Workplace Toxicity Assessment CTA */}
            <div className="card-paper flex flex-col items-start gap-4 border-2 border-dashed border-ink p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <div>
                <p className="eyebrow">Environment</p>
                <h3 className="mt-1 font-serif text-2xl font-bold">
                  Workplace Toxicity Assessment
                </h3>
                <p className="mt-2 max-w-xl text-sm text-ink-soft">
                  Rate your environment across five dimensions — Balance, Safety, Growth,
                  Autonomy, Belonging — and we'll tune tomorrow's briefing to what threatens
                  your archetype most.
                </p>
              </div>
              <Link
                to="/audit"
                className="shrink-0 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-paper hover:opacity-90"
              >
                Start Assessment
              </Link>
            </div>

            {/* The Daily Loop — Trigger → Action → Reward */}
            {archetypeRow && (
              <DailyLoop
                briefing={briefing ?? null}
                archetypeName={meta?.name ?? "You"}
                onAcknowledge={() => readMutation.mutate()}
                acknowledging={readMutation.isPending}
                onCompleteAction={() => actionMutation.mutate()}
                completing={actionMutation.isPending}
                onReflect={(text) => reflectionMutation.mutate(text)}
                reflecting={reflectionMutation.isPending}
              />
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="min-w-0 space-y-6">
            <div className="card-paper overflow-hidden">
              <div className="h-20 bg-gradient-to-br from-accent/30 via-paper-dark to-paper-dark" />
              <div className="px-6 pb-6 text-center">
                <div className="mx-auto -mt-12 grid h-24 w-24 place-items-center rounded-full border-4 border-paper bg-paper-dark text-4xl shadow-lift">
                  {meta?.icon ?? "◐"}
                </div>
                <p className="mt-3 font-serif text-lg font-bold">
                  {user.user_metadata?.full_name ?? user.email?.split("@")[0]}
                </p>
                <p className="text-xs text-ink-muted">
                  {meta ? meta.tagline : "Unassessed"}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 border-y border-border/60 py-4">
                  <Stat n={streak?.current_streak ?? 0} label="Streak" />
                  <Stat n={streak?.total_briefings_read ?? 0} label="Read" />
                  <Stat n={streak?.longest_streak ?? 0} label="Best" />
                </div>

                {meta && (
                  <div className="mt-5 rounded-xl border border-border bg-paper-dark/40 p-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base font-bold text-accent">
                        {meta.name}
                      </span>
                      <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                        Confidence {Math.round(Number(archetypeRow!.confidence) * 100)}%
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {skillRows.map((s) => (
                        <SkillBar key={s.label} label={s.label} value={s.value} />
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  to={meta ? "/archetypes/$slug" : "/quiz"}
                  params={meta ? { slug: meta.slug } : undefined}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-paper hover:opacity-90"
                >
                  {meta ? "View Full Profile" : "Take the assessment"}
                </Link>
              </div>
            </div>

            {adminStatus?.isAdmin && (
              <div className="card-paper p-6">
                <p className="eyebrow">Test profiles</p>
                <p className="mt-2 text-xs text-ink-muted">
                  Admin only. Switch your profile to any archetype to review its
                  personalised feed, briefing and pathways.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {ARCHETYPES.map((a) => {
                    const active = archetypeRow?.archetype_slug === a.slug;
                    return (
                      <button
                        key={a.slug}
                        type="button"
                        disabled={previewMutation.isPending || active}
                        onClick={() => previewMutation.mutate(a.slug)}
                        className={`press flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors disabled:opacity-60 ${
                          active
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent hover:text-accent"
                        }`}
                      >
                        <span aria-hidden className="text-base">{a.icon}</span>
                        <span className="truncate">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
                {previewMutation.isPending && (
                  <p className="mt-3 text-xs text-ink-muted">Switching…</p>
                )}
              </div>
            )}



            {dims && meta && (
              <ArchetypeRadar
                scores={dims}
                signature={archetypeSignature(meta.slug)}
                signatureName={meta.name}
                confidence={Number(archetypeRow!.confidence)}
              />
            )}

            <div className="card-paper p-6">
              <p className="eyebrow">Quick moves</p>
              <ul className="mt-3 space-y-2 text-sm">
                <SideLink to="/feed" label="Full feed" />
                <SideLink to="/pathways" label="Learning pathways" />
                <SideLink to="/archetypes" label="The atlas" />
                <SideLink to="/audit" label="Workplace audit" />
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Sticky habit ring */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-paper px-4 py-3 text-xs font-semibold shadow-lift sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {habitDone} of {habits.length} habits logged today
        </div>
        <button
          onClick={() => !briefing?.read_at && briefing && readMutation.mutate()}
          title="Log daily habit"
          className="grid h-16 w-16 place-items-center rounded-full shadow-lift transition-transform hover:rotate-6 hover:scale-105"
          style={{
            background: `conic-gradient(var(--accent) ${habitPct}%, var(--paper-dark) ${habitPct}%)`,
          }}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-paper font-mono text-xs font-bold text-ink">
            {habitDone}/{habits.length}
          </span>
        </button>
      </div>
    </AppShell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-xl font-bold">{n}</p>
      <p className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</p>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span>{label}</span>
        <span className="font-mono text-ink-muted">{value}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-paper-dark">
        <div
          className="h-1.5 rounded-full bg-accent transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SideLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-ink-soft hover:border-border hover:bg-paper-dark/30 hover:text-ink"
      >
        <span>{label}</span>
        <span aria-hidden>→</span>
      </Link>
    </li>
  );
}

/* ---------- Mosaic Feed ---------- */

type MosaicSlot = "card" | "quote";
// Even grid: every article gets the same tile size; one quote tile breaks it up.
const QUOTE_INDEX = 3;

function MosaicGrid({
  articles,
  userId,
  briefing,
}: {
  articles: ArticleFeedItem[];
  userId: string;
  briefing?: { content: string; focus: string; read_at: string | null } | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openArticle = articles.find((a) => a.id === openId) ?? null;
  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {articles.map((a, i) => (
          <Fragment key={a.id}>
            {i === QUOTE_INDEX && (
              <QuoteTile
                text={
                  briefing?.focus
                    ? `Focus: ${briefing.focus}`
                    : "One deliberate act beats ten reactive ones."
                }
              />
            )}
            <MosaicCard
              article={a}
              userId={userId}
              slot="card"
              onToggle={() => setOpenId(a.id)}
            />
          </Fragment>
        ))}
      </div>
      <ArticleReaderModal article={openArticle} onClose={() => setOpenId(null)} />
    </>
  );
}

function QuoteTile({ text }: { text: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-paper-dark/40 p-6 text-center">
      <p className="font-serif text-base italic leading-snug text-ink-soft">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

const SLOT_CLASSES: Record<Exclude<MosaicSlot, "quote">, string> = {
  card: "min-h-[260px]",
};



function MosaicCard({
  article,
  userId,
  slot,
  onToggle,
}: {
  article: ArticleFeedItem;
  userId: string;
  slot: Exclude<MosaicSlot, "quote">;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const toggle = useServerFn(toggleArticleLike);
  const like = useMutation({
    mutationFn: (liked: boolean) =>
      toggle({ data: { articleId: article.id, liked } }),
    onMutate: async (liked) => {
      await qc.cancelQueries({ queryKey: ["feed", userId] });
      const prev = qc.getQueryData<{ archetypeSlug: string | null; articles: ArticleFeedItem[] }>([
        "feed",
        userId,
      ]);
      if (prev) {
        qc.setQueryData(["feed", userId], {
          ...prev,
          articles: prev.articles.map((x) =>
            x.id === article.id ? { ...x, liked } : x,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed", userId], ctx.prev);
    },
  });

  void slot;
  const showImage = Boolean(article.hero_image_url);
  const isFeature = false;

  return (
    <article
      className={`group relative flex flex-col justify-end overflow-hidden rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lift ${SLOT_CLASSES[slot]} ${
        isFeature ? "border-accent bg-accent/5" : "border-border bg-paper"
      }`}
    >
      {isFeature && (
        <span className="absolute left-3 top-3 z-10 rounded-full border border-accent bg-paper/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
          Deep Dive
        </span>
      )}
      {showImage && (
        <button
          onClick={onToggle}
          className="absolute inset-0 -z-0 block"
          aria-label={article.title}
        >
          <img
            src={article.hero_image_url!}
            alt=""
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />
        </button>
      )}
      <div className={`relative z-10 ${showImage ? "text-paper" : ""}`}>
        <p
          className={`font-mono text-[10px] uppercase tracking-widest ${
            showImage ? "text-paper/80" : "text-ink-muted"
          }`}
        >
          {article.category} · {article.read_minutes}m
        </p>
        <button onClick={onToggle} className="mt-1 text-left">
          <h3
            className={`font-serif font-bold leading-tight hover:opacity-90 ${
              isFeature ? "text-xl md:text-2xl" : "text-sm md:text-base"
            } ${showImage ? "text-paper" : "text-ink"}`}
          >
            {article.title}
          </h3>
        </button>
        {true && (
          <p
            className={`mt-1 line-clamp-2 text-xs ${
              showImage ? "text-paper/80" : "text-ink-soft"
            }`}
          >
            {article.tldr ?? article.excerpt}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              like.mutate(!article.liked);
            }}
            aria-pressed={article.liked}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
              article.liked
                ? "border-accent bg-accent text-accent-foreground"
                : showImage
                  ? "border-paper/40 text-paper hover:bg-paper/10"
                  : "border-border text-ink-soft hover:border-ink"
            }`}
          >
            <span aria-hidden>{article.liked ? "♥" : "♡"}</span>
            {article.liked ? "Liked" : "Like"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ---------- The Daily Loop: Trigger → Action → Reward ---------- */

type BriefingRow = {
  id: string;
  content: string;
  focus: string;
  micro_action: string;
  read_at: string | null;
  briefing_date: string;
  archetype_slug: string;
  toxicity_alert: string | null;
  evening_prompt: string | null;
  reflection: string | null;
  ai_validation: string | null;
  action_done_at: string | null;
  reflection_done_at: string | null;
};

function DailyLoop({
  briefing,
  archetypeName,
  onAcknowledge,
  acknowledging,
  onCompleteAction,
  completing,
  onReflect,
  reflecting,
}: {
  briefing: BriefingRow | null;
  archetypeName: string;
  onAcknowledge: () => void;
  acknowledging: boolean;
  onCompleteAction: () => void;
  completing: boolean;
  onReflect: (text: string) => void;
  reflecting: boolean;
}) {
  const [draft, setDraft] = useState("");
  const acknowledged = !!briefing?.read_at;
  const actionDone = !!briefing?.action_done_at;
  const reflected = !!briefing?.reflection_done_at;

  const phase: 1 | 2 | 3 = reflected ? 3 : actionDone ? 3 : acknowledged ? 2 : 1;
  const percent = reflected ? 100 : actionDone ? 66 : acknowledged ? 33 : 10;

  return (
    <div className="card-paper overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 px-6 pb-4 pt-6 md:px-8">
        <div>
          <p className="eyebrow">The Daily Loop</p>
          <h2 className="mt-1 font-serif text-2xl font-bold">Trigger · Action · Reward</h2>
        </div>
        {briefing && (
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            Focus: {briefing.focus}
          </span>
        )}
      </div>

      <div className="px-6 md:px-8">
        <div className="mt-5 h-1.5 rounded-full bg-paper-dark">
          <div
            className="h-1.5 rounded-full bg-accent transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          <span className={phase >= 1 ? "text-ink" : ""}>1 · Morning Trigger</span>
          <span className={phase >= 2 ? "text-ink" : ""}>2 · Daily Prescription</span>
          <span className={phase >= 3 ? "text-ink" : ""}>3 · Evening Reflection</span>
        </div>
      </div>

      {!briefing ? (
        <p className="p-6 text-ink-muted md:p-8">Composing today's loop…</p>
      ) : (
        <div className="space-y-5 p-6 md:p-8">
          {/* PHASE 1 — Morning Trigger */}
          <PhaseBlock
            index={1}
            active={phase === 1}
            done={acknowledged}
            title="Morning Briefing"
            kicker="Toxicity alert"
          >
            <p className="font-serif text-base italic leading-snug text-ink">
              {briefing.toxicity_alert ??
                `${archetypeName}, today's environment is shifting. Here is your playbook.`}
            </p>
            <p className="mt-3 whitespace-pre-line font-serif text-[15px] leading-relaxed text-ink-soft">
              {briefing.content}
            </p>
            {!acknowledged && (
              <button
                onClick={onAcknowledge}
                disabled={acknowledging}
                className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper disabled:opacity-40"
              >
                Acknowledge the trigger →
              </button>
            )}
          </PhaseBlock>

          {/* PHASE 2 — Daily Prescription */}
          <PhaseBlock
            index={2}
            active={phase === 2}
            done={actionDone}
            locked={!acknowledged}
            title="Daily Prescription"
            kicker="Counterintuitive move"
          >
            <p className="font-serif text-lg leading-snug text-ink">
              {briefing.micro_action}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Designed to break the {archetypeName}'s default loop. Small, specific, doable today.
            </p>
            {acknowledged && !actionDone && (
              <button
                onClick={onCompleteAction}
                disabled={completing}
                className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
              >
                I did it — mark complete
              </button>
            )}
            {actionDone && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-accent">
                ✓ Prescription taken · Reflection unlocked
              </p>
            )}
          </PhaseBlock>

          {/* PHASE 3 — Evening Reflection */}
          <PhaseBlock
            index={3}
            active={phase === 3 && !reflected}
            done={reflected}
            locked={!actionDone}
            title="Evening Reflection"
            kicker="Reward loop"
          >
            <p className="font-serif text-base italic leading-snug text-ink-soft">
              {briefing.evening_prompt ??
                "What happened when you tried the counter-move? Where did the resistance show up?"}
            </p>

            {reflected ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-border/70 bg-paper-dark/30 p-4">
                  <p className="eyebrow">Your reflection</p>
                  <p className="mt-1 text-sm text-ink">{briefing.reflection}</p>
                </div>
                <div className="rounded-md border-2 border-accent/60 bg-accent/5 p-4">
                  <p className="eyebrow text-accent">Atelier · Growth logged</p>
                  <p className="mt-1 font-serif text-[15px] italic leading-relaxed text-ink">
                    {briefing.ai_validation}
                  </p>
                </div>
              </div>
            ) : actionDone ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="A few honest sentences. What resistance came up? What shifted?"
                  rows={4}
                  className="input w-full resize-y"
                />
                <button
                  onClick={() => onReflect(draft.trim())}
                  disabled={reflecting || draft.trim().length < 3}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper disabled:opacity-40"
                >
                  {reflecting ? "Closing the loop…" : "Close the loop"}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                Unlocks once today's prescription is complete.
              </p>
            )}
          </PhaseBlock>
        </div>
      )}
    </div>
  );
}

function PhaseBlock({
  index,
  active,
  done,
  locked,
  title,
  kicker,
  children,
}: {
  index: number;
  active?: boolean;
  done?: boolean;
  locked?: boolean;
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition ${
        locked
          ? "border-dashed border-border bg-paper-dark/20 opacity-60"
          : done
            ? "border-accent/60 bg-accent/5"
            : active
              ? "border-ink bg-paper shadow-lift"
              : "border-border bg-paper"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-8 w-8 place-items-center rounded-full font-mono text-xs font-bold ${
            done
              ? "bg-accent text-accent-foreground"
              : locked
                ? "bg-paper-dark text-ink-muted"
                : "bg-ink text-paper"
          }`}
        >
          {done ? "✓" : index}
        </span>
        <div>
          <p className="eyebrow">{kicker}</p>
          <h3 className="font-serif text-lg font-bold leading-tight">{title}</h3>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
