import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/site/AppShell";
import {
  AUDIT_LIKERT,
  AUDIT_QUESTIONS,
  AUDIT_DIMENSION_LABELS,
  type AuditDimension,
} from "@/lib/workplace-audit";
import { getLatestAudit, saveWorkplaceAudit } from "@/lib/workplace-audit.functions";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Workplace Audit — The Cognitive Atelier" },
      { name: "description", content: "A 5-dimension audit of your work environment." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchLatest = useServerFn(getLatestAudit);
  const save = useServerFn(saveWorkplaceAudit);
  const { data: latest, isLoading } = useQuery({
    queryKey: ["audit", user.id],
    queryFn: () => fetchLatest(),
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [retaking, setRetaking] = useState(false);

  const mutation = useMutation({
    mutationFn: () => save({ data: answers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit", user.id] });
      setRetaking(false);
      navigate({ to: "/dashboard" });
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <section className="container-page py-8 md:py-14">Loading…</section>
      </AppShell>
    );
  }

  const showResults = latest && !retaking;

  return (
    <AppShell>
      <section className="container-page py-8 md:py-14">
        <p className="eyebrow">Workplace Audit</p>
        <h1 className="mt-2 font-serif text-4xl font-bold">
          {showResults ? "Your workplace signal" : "Diagnose your environment"}
        </h1>

        {showResults ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card-paper p-6 md:col-span-2">
              <p className="eyebrow">Toxicity index</p>
              <p className="mt-2 font-serif text-5xl font-bold">
                {Math.round(Number(latest.toxicity_score) * 100)}
                <span className="text-xl text-ink-muted"> / 100</span>
              </p>
              <p className="mt-2 text-ink-soft">
                0 = thriving environment · 100 = toxic environment.
              </p>
            </div>
            {(
              [
                "autonomy",
                "psychological_safety",
                "workload",
                "recognition",
                "purpose",
              ] as AuditDimension[]
            ).map((d) => (
              <div key={d} className="card-paper p-6">
                <p className="eyebrow">{AUDIT_DIMENSION_LABELS[d]}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-muted">Health</span>
                  <span className="font-mono text-xs">
                    {Math.round(Number(latest[d]) * 100)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-paper-dark">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${Math.round(Number(latest[d]) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setAnswers({});
                setRetaking(true);
              }}
              className="rounded-full border border-ink px-5 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
            >
              Retake audit
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {AUDIT_QUESTIONS.map((q, i) => (
              <div key={q.id} className="card-paper p-6">
                <p className="text-xs font-mono uppercase tracking-widest text-ink-muted">
                  {i + 1} / {AUDIT_QUESTIONS.length} · {AUDIT_DIMENSION_LABELS[q.dimension]}
                </p>
                <p className="mt-2 font-serif text-lg">{q.prompt}</p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {AUDIT_LIKERT.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                      className={`rounded-full border px-2 py-2 text-xs font-medium transition ${
                        answers[q.id] === opt.value
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border text-ink-soft hover:border-ink hover:text-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              disabled={
                mutation.isPending ||
                AUDIT_QUESTIONS.some((q) => answers[q.id] == null)
              }
              onClick={() => mutation.mutate()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {mutation.isPending ? "Saving…" : "Score my environment"}
            </button>
            {mutation.error && (
              <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
