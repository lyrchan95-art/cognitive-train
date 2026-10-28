import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/site/AppShell";
import {
  QUESTIONS,
  LIKERT,
  DIMENSION_LABELS,
  evaluate,
  getArchetypeMeta,
  type Responses,
} from "@/lib/quiz";
import { supabase } from "@/integrations/supabase/client";
import { saveQuizResult } from "@/lib/user-archetype.functions";

const STORAGE_KEY = "pending_quiz_responses";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "The Archetype Quiz — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "Thirty questions across six psychological dimensions. Discover which of twelve Cognitive Archetypes describes how you actually work.",
      },
      { property: "og:title", content: "Discover your Cognitive Archetype" },
      {
        property: "og:description",
        content: "A 30-question assessment across six dimensions. About three minutes.",
      },
    ],

  }),
  component: QuizPage,
});

function QuizPage() {
  const [responses, setResponses] = useState<Responses>({});
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const save = useServerFn(saveQuizResult);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setSession({ userId: data.session.user.id });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { userId: s.user.id } : null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Auto-persist any pending answers left before sign-in.
  useEffect(() => {
    if (phase !== "intro") return;
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Responses;
      if (parsed && typeof parsed === "object") {
        setResponses(parsed);
        setPhase("result");
      }
    } catch {
      /* ignore */
    }
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, [phase]);

  const total = QUESTIONS.length;
  const current = QUESTIONS[index];
  const answered = Object.keys(responses).length;
  const result = useMemo(
    () => (Object.keys(responses).length === total ? evaluate(responses) : null),
    [responses, total],
  );

  function answer(value: number) {
    const next = { ...responses, [current.id]: value };
    setResponses(next);
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      setPhase("result");
    }
  }

  async function handleSave() {
    if (!result) return;
    if (!session) {
      // Stash and send to auth. On return, /quiz remounts, hydrates responses, shows result.
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
      }
      navigate({ to: "/auth", search: { redirect: "/quiz", mode: "signup" } });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await save({ data: responses });
      setSaved(true);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save your result.");
    } finally {
      setSaving(false);
    }
  }

  if (phase === "intro") {
    return (
      <AppShell>
        <section className="container-page py-10 md:py-16">
          <div className="card-paper mx-auto max-w-2xl p-10 text-center md:p-14">
            <p className="eyebrow">The Assessment</p>
            <h1 className="mt-4 font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Discover your Cognitive Archetype
            </h1>
            <p className="mt-5 text-ink-soft">
              Thirty statements across six dimensions —{" "}
              <em>
                conscientiousness, openness, emotional reactivity, environmental sensitivity,
                affiliation, drive
              </em>
              . Answer honestly. There are no right answers, only true ones.
            </p>
            <p className="mt-3 text-sm text-ink-muted">Takes about 3 minutes.</p>

            <button
              onClick={() => setPhase("quiz")}
              className="mt-8 inline-flex rounded-full bg-ink px-8 py-3 text-sm font-semibold text-paper hover:opacity-90"
            >
              Begin
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  if (phase === "quiz") {
    return (
      <AppShell>
        <section className="container-page py-10 md:py-16">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-ink-muted">
              <span>
                Question {index + 1} of {total}
              </span>
              <span>{Math.round((answered / total) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-paper-dark">
              <div
                className="h-1 rounded-full bg-accent transition-all"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>

            <div className="card-paper mt-8 p-8 md:p-12">
              <p className="eyebrow">{DIMENSION_LABELS[current.dimension]}</p>
              <h2 className="mt-4 font-serif text-2xl font-bold leading-snug md:text-3xl">
                {current.prompt}
              </h2>

              <div className="mt-8 space-y-2">
                {LIKERT.map((opt) => {
                  const selected = responses[current.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => answer(opt.value)}
                      className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? "border-accent bg-accent/10 text-ink"
                          : "border-border hover:border-ink"
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="font-mono text-xs text-ink-muted">{opt.value}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-between text-sm">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={responses[current.id] == null || index === total - 1}
                  className="text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  Skip →
                </button>
              </div>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  // Result phase
  const meta = result ? getArchetypeMeta(result.archetypeSlug) : null;
  return (
    <AppShell>
      <section className="container-page py-10 md:py-16">
        <div className="mx-auto max-w-2xl">
          {result && meta ? (
            <div className="card-paper p-8 md:p-12">
              <p className="eyebrow">Your archetype</p>
              <div className="mt-4 flex items-start gap-4">
                <span className="text-6xl">{meta.icon}</span>
                <div>
                  <h1 className="font-serif text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{meta.name}</h1>
                  <p className="mt-1 italic text-ink-muted">{meta.tagline}</p>
                </div>
              </div>
              <p className="mt-6 text-lg text-ink-soft">{meta.headline}</p>
              <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
                Confidence: {Math.round(result.confidence * 100)}%
              </p>

              <div className="mt-8 border-t border-border pt-6">
                <p className="eyebrow">Today's prescription</p>
                <p className="mt-3 font-serif text-lg italic leading-relaxed">
                  "{meta.prescription}"
                </p>
              </div>

              {saveError && (
                <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {!saved && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving…"
                      : session
                        ? "Save to my dashboard →"
                        : "Save my result (sign up) →"}
                  </button>
                )}
                <Link
                  to="/archetypes/$slug"
                  params={{ slug: meta.slug }}
                  className="rounded-full border border-ink px-6 py-3 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
                >
                  Read the full profile
                </Link>
              </div>

              <div className="mt-10">
                <p className="eyebrow mb-3">Runners-up</p>
                <ul className="space-y-1 text-sm">
                  {result.ranked.slice(1, 4).map((r) => {
                    const m = getArchetypeMeta(r.slug);
                    if (!m) return null;
                    return (
                      <li key={r.slug} className="flex justify-between text-ink-soft">
                        <span>
                          {m.icon} {m.name}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
                          {Math.round(r.score * 100)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <div className="card-paper p-10 text-center">
              <p>Please complete all questions.</p>
              <button
                onClick={() => setPhase("quiz")}
                className="mt-4 rounded-full bg-ink px-6 py-2 text-sm text-paper"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
