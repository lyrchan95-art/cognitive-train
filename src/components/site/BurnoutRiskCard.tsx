import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyBurnoutRisk, saveCheckIn } from "@/lib/checkins.functions";
import type { RiskBand, RiskResult } from "@/lib/burnout-risk";

type CheckInValues = { energy: number; stress: number; workload: number; control: number };

const ITEMS: { key: keyof CheckInValues; prompt: string; low: string; high: string }[] = [
  { key: "energy", prompt: "Energy today", low: "Drained", high: "Energised" },
  { key: "stress", prompt: "Stress today", low: "Calm", high: "Very stressed" },
  { key: "workload", prompt: "Workload today", low: "Light", high: "Overwhelming" },
  { key: "control", prompt: "Control over how you work", low: "None", high: "Full" },
];

const BAND_STYLE: Record<RiskBand, { label: string; className: string }> = {
  low: { label: "Low", className: "text-ink" },
  moderate: { label: "Moderate", className: "text-accent-gold" },
  elevated: { label: "Elevated", className: "text-accent" },
  high: { label: "High", className: "text-destructive" },
};

export function BurnoutRiskCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fetchRisk = useServerFn(getMyBurnoutRisk);
  const save = useServerFn(saveCheckIn);
  const [editing, setEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["burnout-risk", userId],
    queryFn: () => fetchRisk(),
    retry: false,
  });

  const checkIn = useMutation({
    mutationFn: (values: CheckInValues) => save({ data: values }),
    onSuccess: async () => {
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["burnout-risk", userId] });
      toast.success("Check-in saved", { description: "Your risk score has been updated." });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const showForm = editing || (data && !data.today);

  return (
    <div className="card-paper p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Burnout risk</p>
          <h2 className="mt-1 font-serif text-2xl font-bold">Today's signal</h2>
        </div>
        <Link to="/methodology" className="text-xs font-medium text-accent hover:underline">
          How this is calculated →
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-6 text-ink-muted">Loading your signal…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-ink-muted">
          Your risk score is unavailable right now. Try again shortly.
        </p>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            {showForm ? (
              <CheckInForm
                initial={data?.today ?? undefined}
                pending={checkIn.isPending}
                onSubmit={(v) => checkIn.mutate(v)}
                onCancel={data?.today ? () => setEditing(false) : undefined}
              />
            ) : (
              <div className="rounded-xl border border-border bg-paper-dark/30 p-4">
                <p className="text-sm font-medium">Checked in today ✓</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {data!.risk.checkInsLast7} of the last 7 days logged.
                </p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-3 text-xs font-medium text-accent hover:underline"
                >
                  Edit today's check-in
                </button>
              </div>
            )}
            {data && !data.hasAudit && (
              <p className="mt-4 text-xs text-ink-muted">
                Your score only reflects check-ins so far.{" "}
                <Link to="/audit" className="font-medium text-accent hover:underline">
                  Take the workplace audit
                </Link>{" "}
                to factor in your environment.
              </p>
            )}
          </div>

          {data && <RiskSummary risk={data.risk} />}
        </div>
      )}

      <p className="mt-6 border-t border-border/60 pt-4 text-[11px] leading-relaxed text-ink-muted">
        A wellbeing signal, not a medical diagnosis. If you are struggling, please talk to someone
        you trust or a professional.
      </p>
    </div>
  );
}

function RiskSummary({ risk }: { risk: RiskResult }) {
  if (risk.status === "insufficient" || risk.score == null || !risk.band) {
    return (
      <div className="grid place-items-center rounded-xl border-2 border-dashed border-border p-6 text-center">
        <p className="font-serif text-lg font-bold">No score yet</p>
        <p className="mt-1 max-w-xs text-sm text-ink-muted">
          Complete your first check-in and your burnout-risk score appears here.
        </p>
      </div>
    );
  }

  const band = BAND_STYLE[risk.band];
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <p className={`font-serif text-5xl font-bold leading-none ${band.className}`}>
          {risk.score}
          <span className="text-lg text-ink-muted">/100</span>
        </p>
        <div className="pb-1">
          <p className={`text-sm font-semibold uppercase tracking-widest ${band.className}`}>
            {band.label}
          </p>
          {risk.trend && (
            <p className="text-xs text-ink-muted">
              {risk.trend === "rising"
                ? "↑ Rising"
                : risk.trend === "falling"
                  ? "↓ Easing"
                  : "→ Steady"}{" "}
              vs last week
            </p>
          )}
        </div>
      </div>
      {risk.status === "provisional" && (
        <p className="mt-2 text-xs text-ink-muted">
          Provisional — the score firms up after 3 check-ins in a week.
        </p>
      )}

      <StrainStrip series={risk.series} />

      {risk.drivers.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow">What's driving it</p>
          <ul className="mt-2 space-y-3">
            {risk.drivers.map((d) => (
              <li key={d.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm font-medium">
                  <span>{d.label}</span>
                  <span className="font-mono text-xs text-ink-muted">+{d.contribution} pts</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{d.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {risk.band === "high" && (
        <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs leading-relaxed text-ink-soft">
          Your signal is high. Consider raising workload with your manager, and if you feel unable
          to cope, reach out for support — in Hong Kong, the 24-hour Mental Health Support Hotline
          is{" "}
          <a href="tel:18111" className="font-semibold text-ink underline">
            18111
          </a>
          .
        </div>
      )}
    </div>
  );
}

function StrainStrip({ series }: { series: RiskResult["series"] }) {
  return (
    <div className="mt-5">
      <p className="eyebrow">Daily strain · last 14 days</p>
      <div
        className="mt-2 flex h-12 items-end gap-1"
        role="img"
        aria-label={`Daily strain over the last 14 days: ${series
          .map((s) => (s.strain == null ? "no check-in" : `${Math.round(s.strain * 100)}%`))
          .join(", ")}`}
      >
        {series.map((s) => (
          <div
            key={s.date}
            title={`${s.date}: ${s.strain == null ? "no check-in" : `${Math.round(s.strain * 100)}% strain`}`}
            className={`flex-1 rounded-sm ${s.strain == null ? "bg-paper-dark" : "bg-accent"}`}
            style={{ height: s.strain == null ? "4px" : `${Math.max(8, s.strain * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function CheckInForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: CheckInValues;
  pending: boolean;
  onSubmit: (v: CheckInValues) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Partial<CheckInValues>>(initial ?? {});
  const complete = ITEMS.every((i) => values[i.key] != null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) onSubmit(values as CheckInValues);
      }}
    >
      <p className="text-sm font-medium">30-second check-in</p>
      <div className="mt-3 space-y-4">
        {ITEMS.map((item) => (
          <fieldset key={item.key}>
            <legend className="text-xs font-semibold">{item.prompt}</legend>
            <div className="mt-1.5 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = values[item.key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${item.prompt}: ${n} of 5`}
                    onClick={() => setValues((v) => ({ ...v, [item.key]: n }))}
                    className={`press h-9 flex-1 rounded-md border text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-ink-muted">
              <span>{item.low}</span>
              <span>{item.high}</span>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={!complete || pending}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save check-in"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
