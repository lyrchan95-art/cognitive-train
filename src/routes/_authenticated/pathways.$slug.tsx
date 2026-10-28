import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/site/AppShell";
import {
  getPathwayBySlug,
  getMyPathwayProgress,
  completePathwayDay,
  resetPathwayDay,
  getMyStreak,
} from "@/lib/pathways.functions";
import { getArchetypeMeta } from "@/lib/quiz";

export const Route = createFileRoute("/_authenticated/pathways/$slug")({
  component: PathwayDetail,
});

type View = "journey" | "lesson";

function PathwayDetail() {
  const { user } = Route.useRouteContext();
  const { slug } = Route.useParams();
  const fetchPw = useServerFn(getPathwayBySlug);
  const fetchProgress = useServerFn(getMyPathwayProgress);
  const complete = useServerFn(completePathwayDay);
  const reset = useServerFn(resetPathwayDay);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pathway", slug],
    queryFn: () => fetchPw({ data: { slug } }),
  });

  const fetchStreak = useServerFn(getMyStreak);
  const { data: streak = 0 } = useQuery({
    queryKey: ["my-streak", user.id],
    queryFn: () => fetchStreak(),
  });

  const { data: progress } = useQuery({
    queryKey: ["pathway-progress", user.id, data?.pathway.id],
    queryFn: () => fetchProgress({ data: { pathwayId: data!.pathway.id } }),
    enabled: !!data?.pathway.id,
  });

  const doneDays = useMemo(() => new Set((progress ?? []).map((p) => p.day_number)), [progress]);
  const highestDone = useMemo(
    () => (progress ?? []).reduce((m, p) => Math.max(m, p.day_number), 0),
    [progress],
  );
  const totalXp = useMemo(
    () => (progress ?? []).reduce((s, p) => s + (p.xp_awarded ?? 50), 0),
    [progress],
  );

  const [view, setView] = useState<View>("journey");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizStatus, setQuizStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [journal, setJournal] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const activeLesson = data?.days.find((d) => d.day_number === activeDay);
  const isDoneActive = doneDays.has(activeDay);
  const isUnlockedActive = activeDay <= highestDone + 1;

  useEffect(() => {
    if (view === "lesson") {
      const existing = progress?.find((p) => p.day_number === activeDay)?.journal_entry ?? "";
      setJournal(existing);
      setSelectedAnswer(null);
      setQuizStatus(isDoneActive ? "correct" : "idle");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [view, activeDay, progress, isDoneActive]);

  const mutComplete = useMutation({
    mutationFn: (v: { journalEntry: string }) =>
      complete({
        data: {
          pathwayId: data!.pathway.id,
          dayNumber: activeDay,
          journalEntry: v.journalEntry,
          quizCorrect: true,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pathway-progress", user.id, data?.pathway.id] });
      qc.invalidateQueries({ queryKey: ["pathways", user.id] });
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2200);
      setTimeout(() => setView("journey"), 900);
    },
  });

  const mutReset = useMutation({
    mutationFn: () => reset({ data: { pathwayId: data!.pathway.id, dayNumber: activeDay } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pathway-progress", user.id, data?.pathway.id] });
      setQuizStatus("idle");
      setJournal("");
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="container-page space-y-4 py-12">
          <div className="h-6 w-40 animate-pulse rounded bg-paper-dark" />
          <div className="h-32 w-full animate-pulse rounded-2xl bg-paper-dark" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-paper-dark" />
        </div>
      </AppShell>
    );
  }

  const { pathway, days } = data;
  const meta = getArchetypeMeta(pathway.archetype_slug);
  const pct = Math.round((doneDays.size / pathway.duration_days) * 100);
  const isComplete = doneDays.size >= pathway.duration_days;
  const unit = pathway.required_streak > 0 ? "Week" : "Day";
  const unitLower = unit.toLowerCase();
  const programLocked = pathway.required_streak > 0 && streak < pathway.required_streak;

  if (programLocked) {
    return (
      <AppShell>
        <section className="container-page py-10 md:py-16">
          <Link to="/pathways" className="text-sm text-ink-muted hover:text-accent">
            ← All pathways
          </Link>
          <div className="card-paper rise-in mx-auto mt-6 max-w-xl p-6 text-center sm:p-10">
            <p className="text-5xl">🔒</p>
            <h1 className="mt-4 font-serif text-2xl font-bold sm:text-3xl">{pathway.title}</h1>
            <p className="mt-3 text-sm text-ink-soft sm:text-base">
              This program unlocks at a {pathway.required_streak}-day streak, or with Premium. You
              are at {streak} of {pathway.required_streak}.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-paper-dark">
              <div
                className="h-2 rounded-full bg-accent transition-all duration-700"
                style={{ width: `${Math.min(100, (streak / pathway.required_streak) * 100)}%` }}
              />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/dashboard"
                className="press rounded-xl bg-ink px-5 py-3 text-sm font-bold text-paper"
              >
                Continue today's loop
              </Link>
              <Link
                to="/pricing"
                className="press rounded-xl border border-ink px-5 py-3 text-sm font-bold"
              >
                Unlock with Premium
              </Link>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  function openLesson(day: number) {
    if (day > highestDone + 1) return;
    setActiveDay(day);
    setView("lesson");
  }

  function answerQuiz(idx: number) {
    if (!activeLesson) return;
    setSelectedAnswer(idx);
    setQuizStatus(idx === activeLesson.quiz_answer_index ? "correct" : "incorrect");
  }

  return (
    <AppShell>
      <section className="container-page py-6 md:py-8">
        {view === "journey" ? (
          <>
            <Link to="/pathways" className="text-sm text-ink-muted hover:text-accent">
              ← All pathways
            </Link>
            <header className="mt-4 grid gap-6 border-b-2 border-ink pb-8 md:grid-cols-[1.2fr_1fr] md:gap-8">
              <div className="min-w-0">
                <p className="eyebrow">
                  {meta?.name ?? pathway.archetype_slug} · {pathway.difficulty} ·{" "}
                  {pathway.duration_days} {unitLower}s
                </p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                  {pathway.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
                  {pathway.description}
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                  <Stat
                    label="Progress"
                    value={`${pct}%`}
                    sub={`${doneDays.size}/${pathway.duration_days} ${unitLower}s`}
                  />
                  <Stat label="XP" value={String(totalXp)} sub="+50 each" />
                  <Stat
                    label="Done"
                    value={String(highestDone)}
                    sub={isComplete ? "🏆 Mastered" : highestDone === 0 ? "Start now" : "Keep going"}
                  />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-dark">
                  <div
                    className="h-2 rounded-full bg-accent transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge earned={highestDone >= 1} label="🌱 Initiate" />
                  <Badge earned={highestDone >= 3} label="🔥 On a roll" />
                  <Badge earned={highestDone >= 5} label="⚙️ Deep work" />
                  <Badge earned={isComplete} label="🏆 Mastered" />
                  {pathway.certificate_title && (
                    <Badge earned={isComplete} label={`🎖 ${pathway.certificate_title}`} />
                  )}
                </div>

                {!isComplete && (
                  <button
                    onClick={() => openLesson(Math.min(highestDone + 1, pathway.duration_days))}
                    className="press mt-6 w-full rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-paper hover:opacity-90 sm:w-auto"
                  >
                    {highestDone === 0
                      ? `Start ${unit} 1 →`
                      : `Continue with ${unit} ${highestDone + 1} →`}
                  </button>
                )}
              </div>
              {pathway.hero_image_url && (
                <img
                  src={pathway.hero_image_url}
                  alt=""
                  loading="lazy"
                  className="h-40 w-full rounded-xl object-cover shadow-paper sm:h-56 md:h-full"
                />
              )}
            </header>

            {/* Timeline */}
            <div className="relative mt-8 md:mt-10 md:pl-4">
              <div className="pointer-events-none absolute left-5 top-6 bottom-6 w-px bg-border md:left-8" />
              <ol className="space-y-4 md:space-y-6">
                {days.map((d, i) => {
                  const done = doneDays.has(d.day_number);
                  const current = !done && d.day_number === highestDone + 1;
                  const locked = d.day_number > highestDone + 1;
                  return (
                    <li
                      key={d.id}
                      className="rise-in relative flex items-start gap-3 md:gap-6"
                      style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                    >
                      <div
                        className={`z-10 mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-mono text-xs transition-all md:h-12 md:w-12 md:text-sm ${
                          done
                            ? "border-accent bg-accent text-accent-foreground shadow-lift"
                            : current
                              ? "border-accent bg-paper text-accent animate-pulse"
                              : "border-border bg-paper-dark text-ink-muted"
                        }`}
                      >
                        {done ? "✓" : d.day_number}
                      </div>
                      <button
                        onClick={() => openLesson(d.day_number)}
                        disabled={locked}
                        className={`card-paper press min-w-0 flex-1 p-4 text-left sm:p-6 ${
                          locked
                            ? "cursor-not-allowed opacity-50 grayscale"
                            : "hover:-translate-y-0.5 hover:shadow-lift"
                        } ${current ? "ring-2 ring-accent/40" : ""}`}
                      >
                        <p className="eyebrow truncate">
                          {unit} {d.day_number} · {d.subtitle} · {d.read_minutes} min
                        </p>
                        <h3 className="mt-1 font-serif text-lg font-bold leading-snug sm:text-2xl">
                          {d.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                          {firstParagraph(d.content)}
                        </p>
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                          {done
                            ? "Completed · +50 XP"
                            : current
                              ? "▸ Start now"
                              : locked
                                ? "🔒 Locked"
                                : "Ready"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        ) : (
          <LessonView
            key={activeDay}
            title={activeLesson?.title ?? ""}
            subtitle={activeLesson?.subtitle ?? ""}
            content={activeLesson?.content ?? ""}
            readMinutes={activeLesson?.read_minutes ?? 6}
            actionPrompt={activeLesson?.action_prompt ?? ""}
            quizQuestion={activeLesson?.quiz_question ?? ""}
            quizOptions={(activeLesson?.quiz_options as string[]) ?? []}
            dayNumber={activeDay}
            unitLabel={unit}
            finalDay={pathway.duration_days}
            unlocked={isUnlockedActive}
            done={isDoneActive}
            selectedAnswer={selectedAnswer}
            quizStatus={quizStatus}
            onAnswer={answerQuiz}
            journal={journal}
            setJournal={setJournal}
            onBack={() => setView("journey")}
            onComplete={() => mutComplete.mutate({ journalEntry: journal })}
            onReset={() => mutReset.mutate()}
            pending={mutComplete.isPending}
          />
        )}

        {celebrate && (
          <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center px-6">
            <div className="pop-in rounded-2xl bg-ink px-8 py-7 text-center text-paper shadow-lift sm:px-10 sm:py-8">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">
                {unit} complete
              </p>
              <p className="mt-2 font-serif text-3xl font-bold sm:text-4xl">
                +{activeDay === pathway.duration_days ? 200 : 50} XP
              </p>
              <p className="mt-1 text-sm opacity-80">
                {activeDay === pathway.duration_days
                  ? pathway.certificate_title
                    ? `🎖 ${pathway.certificate_title} earned`
                    : "🏆 Pathway mastered"
                  : "Protocol signed. Return tomorrow."}
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

/* ---------------- helpers ---------------- */

function isHeadingLine(line: string) {
  const l = line.trim();
  if (!l || l.length > 70) return false;
  const letters = l.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.75;
}

function firstParagraph(content: string) {
  const lines = content
    .replace(/''/g, "\u2019")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => !isHeadingLine(l)) ?? content;
}

type Block =
  | { kind: "h"; text: string }
  | { kind: "p"; text: string }
  | { kind: "li"; items: string[] };

function parseLesson(content: string): Block[] {
  const lines = content
    .replace(/''/g, "\u2019")
    .split("\n")
    .map((l) => l.trim());
  const blocks: Block[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push({ kind: "li", items: bullets });
      bullets = [];
    }
  };
  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    if (/^([-•*]|\d+[.)])\s+/.test(line)) {
      bullets.push(line.replace(/^([-•*]|\d+[.)])\s+/, ""));
      continue;
    }
    flush();
    blocks.push({ kind: isHeadingLine(line) ? "h" : "p", text: line });
  }
  flush();
  // Drop a leading heading that merely restates the lesson title.
  if (blocks[0]?.kind === "h") blocks.shift();
  return blocks;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-paper-dark/40 p-2.5 sm:p-3">
      <p className="truncate font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-serif text-xl font-bold sm:text-2xl">{value}</p>
      <p className="truncate text-[11px] text-ink-muted sm:text-xs">{sub}</p>
    </div>
  );
}

function Badge({ earned, label }: { earned: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition sm:px-3 sm:text-xs ${
        earned
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-paper-dark/40 text-ink-muted opacity-60"
      }`}
    >
      {label}
    </span>
  );
}

function LessonView(props: {
  title: string;
  subtitle: string;
  content: string;
  readMinutes: number;
  actionPrompt: string;
  quizQuestion: string;
  quizOptions: string[];
  dayNumber: number;
  unitLabel: string;
  finalDay: number;
  unlocked: boolean;
  done: boolean;
  selectedAnswer: number | null;
  quizStatus: "idle" | "correct" | "incorrect";
  onAnswer: (i: number) => void;
  journal: string;
  setJournal: (v: string) => void;
  onBack: () => void;
  onComplete: () => void;
  onReset: () => void;
  pending: boolean;
}) {
  const canComplete = props.quizStatus === "correct" && props.journal.trim().length >= 10;
  const blocks = useMemo(() => parseLesson(props.content), [props.content]);
  const [readPct, setReadPct] = useState(0);
  const taskRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setReadPct(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mx-auto max-w-3xl pb-28 md:pb-10">
      {/* Sticky lesson header + reading progress */}
      <div className="sticky top-16 z-20 -mx-5 border-b border-border/60 bg-paper/90 px-5 py-2.5 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={props.onBack}
            className="press shrink-0 text-sm text-ink-muted hover:text-accent"
          >
            ← Journey
          </button>
          <span className="truncate font-mono text-[11px] uppercase tracking-widest text-accent">
            {props.unitLabel} {props.dayNumber} · {props.subtitle}
          </span>
        </div>
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-0.5 rounded-full bg-accent transition-[width] duration-150"
            style={{ width: `${readPct}%` }}
          />
        </div>
      </div>

      <article className="rise-in py-8 md:py-10">
        <p className="eyebrow">
          {props.readMinutes} min read · {props.unitLabel} {props.dayNumber} of {props.finalDay}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
          {props.title}
        </h1>
        <div className="mt-4 h-1 w-16 rounded-full bg-accent" />

        <div className="mt-8 space-y-5">
          {blocks.map((b, i) =>
            b.kind === "h" ? (
              <h2
                key={i}
                className="!mt-10 border-l-2 border-accent pl-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-ink"
              >
                {b.text}
              </h2>
            ) : b.kind === "li" ? (
              <ul key={i} className="lesson-prose list-disc space-y-2 pl-5">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="lesson-prose">
                {b.text}
              </p>
            ),
          )}
        </div>

        <button
          onClick={() => taskRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="press mt-10 w-full rounded-xl border-2 border-ink py-3 text-sm font-bold hover:bg-ink hover:text-paper md:w-auto md:px-6"
        >
          Skip to today's task ↓
        </button>

        <div ref={taskRef} className="scroll-mt-32">
          {/* Knowledge check */}
          <section className="mt-10 rounded-2xl border-2 border-ink bg-paper-dark/30 p-5 shadow-paper sm:p-8">
            <p className="eyebrow">Step 1 · Knowledge check</p>
            <p className="mt-2 font-serif text-xl font-bold sm:text-2xl">{props.quizQuestion}</p>
            <div className="mt-5 space-y-3">
              {props.quizOptions.map((opt, idx) => {
                const isRight = props.quizStatus === "correct" && idx === props.selectedAnswer;
                const isWrong = props.quizStatus === "incorrect" && idx === props.selectedAnswer;
                return (
                  <button
                    key={idx}
                    onClick={() => props.onAnswer(idx)}
                    disabled={props.quizStatus === "correct"}
                    className={`press flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3.5 text-left text-sm font-medium sm:p-4 sm:text-base ${
                      isRight
                        ? "border-accent bg-accent/10 text-accent"
                        : isWrong
                          ? "shake-once border-destructive bg-destructive/10 text-destructive"
                          : "border-border bg-paper hover:border-ink"
                    }`}
                  >
                    <span className="min-w-0">{opt}</span>
                    <span className="shrink-0">{isRight ? "✓" : isWrong ? "✗" : ""}</span>
                  </button>
                );
              })}
            </div>
            {props.quizStatus === "correct" && (
              <p className="pop-in mt-4 text-center text-sm font-semibold text-accent">
                Excellent — the core mechanic is grasped.
              </p>
            )}
            {props.quizStatus === "incorrect" && (
              <p className="mt-4 text-center text-sm font-semibold text-destructive">
                Not quite — re-read the section above and try again.
              </p>
            )}
          </section>

          {/* Journal */}
          <section className="mt-6 rounded-2xl border-2 border-ink bg-paper p-5 shadow-paper sm:p-8">
            <p className="eyebrow">Step 2 · The Atelier Journal</p>
            <p className="mt-2 font-serif text-lg sm:text-xl">{props.actionPrompt}</p>
            <textarea
              value={props.journal}
              onChange={(e) => props.setJournal(e.target.value)}
              rows={5}
              placeholder="Document today's friction, insight, or micro-experiment (min. 10 characters)…"
              className="mt-4 w-full rounded-xl border border-border bg-paper-dark/30 p-4 text-base transition focus:border-accent focus:outline-none"
            />
            <div className="mt-2 text-right font-mono text-xs text-ink-muted">
              {props.journal.trim().length >= 10
                ? `${props.journal.trim().length} characters`
                : `${props.journal.trim().length} / 10 characters`}
            </div>

            <button
              onClick={props.onComplete}
              disabled={!canComplete || props.pending}
              className={`press mt-4 hidden w-full rounded-xl py-4 text-base font-bold md:block ${
                canComplete ? "bg-ink text-paper hover:opacity-90" : "bg-paper-dark text-ink-muted"
              }`}
            >
              {completeLabel(props, canComplete)}
            </button>

            {props.done && (
              <button
                onClick={props.onReset}
                className="press mt-3 w-full rounded-xl border border-border py-2 text-sm text-ink-muted hover:border-ink hover:text-ink"
              >
                Reset this module
              </button>
            )}
          </section>
        </div>
      </article>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-paper/95 p-3 backdrop-blur md:hidden">
        <button
          onClick={props.onComplete}
          disabled={!canComplete || props.pending}
          className={`press w-full rounded-xl py-3.5 text-sm font-bold ${
            canComplete ? "bg-ink text-paper" : "bg-paper-dark text-ink-muted"
          }`}
        >
          {completeLabel(props, canComplete)}
        </button>
      </div>
    </div>
  );
}

function completeLabel(
  props: {
    pending: boolean;
    quizStatus: "idle" | "correct" | "incorrect";
    journal: string;
    unitLabel: string;
    dayNumber: number;
    finalDay: number;
  },
  canComplete: boolean,
) {
  if (props.pending) return "Signing…";
  if (props.quizStatus !== "correct") return "Answer the knowledge check to unlock";
  if (props.journal.trim().length < 10) return "Write a brief reflection (10+ characters)";
  return canComplete
    ? `Complete ${props.unitLabel} ${props.dayNumber} · +${props.dayNumber === props.finalDay ? 200 : 50} XP`
    : "Complete";
}
