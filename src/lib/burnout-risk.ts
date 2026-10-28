// Burnout-risk model v1 — client-safe, pure, deterministic.
//
// Combines three signals into a 0–100 score that explains itself:
//   1. Daily check-ins (energy, stress, workload, control) — current strain.
//   2. The latest workplace audit — environmental pressure, with the
//      dimension that matches the person's archetype trigger weighted double.
//   3. Archetype traits (reactivity, sensitivity, affiliation) — a bounded
//      susceptibility multiplier (×0.85 … ×1.15).
// A sustained rise in strain versus the previous week adds a small bonus.
//
// This is a transparent, hand-weighted heuristic, not a trained or clinically
// validated model. Weights are documented on /methodology and are expected to
// be re-fitted once enough check-in data exists. It is a wellbeing signal,
// not a diagnosis.

import { getArchetype } from "@/data/archetypes";
import { AUDIT_DIMENSION_LABELS, type AuditDimension, type AuditScores } from "./workplace-audit";

export const RISK_MODEL_VERSION = "risk-v1";

export type CheckIn = {
  /** YYYY-MM-DD */
  date: string;
  /** 1 = drained … 5 = energised */
  energy: number;
  /** 1 = calm … 5 = very stressed */
  stress: number;
  /** 1 = light … 5 = overwhelming */
  workload: number;
  /** 1 = no control … 5 = full control over how I work */
  control: number;
};

export type RiskTraits = { N?: number; S?: number; A?: number };

export type RiskInputs = {
  /** YYYY-MM-DD, the day the score is computed for. */
  today: string;
  checkIns: CheckIn[];
  audit?: AuditScores | null;
  archetypeSlug?: string | null;
  traits?: RiskTraits | null;
};

export type RiskBand = "low" | "moderate" | "elevated" | "high";
export type RiskStatus = "ok" | "provisional" | "insufficient";
export type RiskTrend = "rising" | "steady" | "falling";

export type RiskDriver = {
  key: string;
  label: string;
  /** Points this factor adds to the 0–100 score. */
  contribution: number;
  detail: string;
};

export type RiskResult = {
  model: typeof RISK_MODEL_VERSION;
  score: number | null;
  band: RiskBand | null;
  status: RiskStatus;
  trend: RiskTrend | null;
  drivers: RiskDriver[];
  series: { date: string; strain: number | null }[];
  checkInsLast7: number;
};

// --- Weights ---------------------------------------------------------------

export const CHECKIN_WEIGHTS = {
  stress: 0.3,
  exhaustion: 0.3,
  workload: 0.25,
  lowControl: 0.15,
} as const;
type CheckInSignal = keyof typeof CHECKIN_WEIGHTS;

export const STRAIN_SHARE = 0.65;
export const ENV_SHARE = 0.35;
export const TRIGGER_WEIGHT = 2;
export const TREND_THRESHOLD = 0.08;
export const TREND_BONUS_RATE = 0.5;
export const TREND_BONUS_CAP = 0.08;

/** The audit dimension each archetype's toxicity trigger maps onto. */
export const TRIGGER_DIMENSION: Record<string, AuditDimension> = {
  sentinel: "autonomy", // Chaos — loss of control over how work happens
  visionary: "autonomy", // Micromanagement
  harmonizer: "psychological_safety", // High conflict
  perfectionist: "psychological_safety", // Criticism
  rebel: "recognition", // Injustice
  anchor: "psychological_safety", // Instability
  explorer: "purpose", // Stagnation
  guardian: "psychological_safety", // Betrayal
  alchemist: "recognition", // Emotional neglect
  strategist: "purpose", // Short-term thinking
  catalyst: "autonomy", // Inertia
  sage: "purpose", // Anti-intellectualism
};

const SIGNAL_COPY: Record<CheckInSignal, { label: string; detail: (v: number) => string }> = {
  stress: {
    label: "Stress",
    detail: (v) => `Your stress has averaged ${pct(v)} of maximum over the last week.`,
  },
  exhaustion: {
    label: "Low energy",
    detail: (v) => `Your energy has been ${pct(1 - v)} of full over the last week.`,
  },
  workload: {
    label: "Workload",
    detail: (v) => `You've rated your workload at ${pct(v)} of overwhelming this week.`,
  },
  lowControl: {
    label: "Low control",
    detail: (v) => `You've felt ${pct(1 - v)} in control of how you work this week.`,
  },
};

export const BANDS: { max: number; band: RiskBand }[] = [
  { max: 35, band: "low" },
  { max: 55, band: "moderate" },
  { max: 70, band: "elevated" },
  { max: Infinity, band: "high" },
];

// --- Model -----------------------------------------------------------------

export function computeBurnoutRisk(input: RiskInputs): RiskResult {
  const todayMs = dayMs(input.today);
  const byAge = new Map<number, CheckIn>();
  for (const c of input.checkIns) {
    const age = Math.round((todayMs - dayMs(c.date)) / 86_400_000);
    if (age < 0 || age > 13) continue;
    byAge.set(age, c);
  }

  const recent = [...byAge.entries()].filter(([age]) => age < 7).map(([, c]) => c);
  const prior = [...byAge.entries()].filter(([age]) => age >= 7).map(([, c]) => c);

  const series = Array.from({ length: 14 }, (_, i) => {
    const age = 13 - i;
    const c = byAge.get(age);
    return { date: shiftDate(input.today, -age), strain: c ? round(strainOf(c), 3) : null };
  });

  const audit = input.audit ?? null;
  if (recent.length === 0 && !audit) {
    return {
      model: RISK_MODEL_VERSION,
      score: null,
      band: null,
      status: "insufficient",
      trend: null,
      drivers: [],
      series,
      checkInsLast7: 0,
    };
  }

  const multiplier = susceptibility(input.traits);
  const strainShare = audit ? (recent.length ? STRAIN_SHARE : 0) : 1;
  const envShare = audit ? (recent.length ? ENV_SHARE : 1) : 0;
  const drivers: RiskDriver[] = [];
  let base = 0;

  if (recent.length) {
    for (const key of Object.keys(CHECKIN_WEIGHTS) as CheckInSignal[]) {
      const v = mean(recent.map((c) => signalsOf(c)[key]));
      const part = CHECKIN_WEIGHTS[key] * v * strainShare;
      base += part;
      drivers.push({
        key: `checkin:${key}`,
        label: SIGNAL_COPY[key].label,
        contribution: part * multiplier * 100,
        detail: SIGNAL_COPY[key].detail(v),
      });
    }
  }

  if (audit) {
    const trigger = input.archetypeSlug ? TRIGGER_DIMENSION[input.archetypeSlug] : undefined;
    const archetype = input.archetypeSlug ? getArchetype(input.archetypeSlug) : undefined;
    const dims = Object.keys(AUDIT_DIMENSION_LABELS) as AuditDimension[];
    const weightOf = (d: AuditDimension) => (d === trigger ? TRIGGER_WEIGHT : 1);
    const totalWeight = dims.reduce((s, d) => s + weightOf(d), 0);
    for (const d of dims) {
      const deficit = auditDeficit(audit[d]);
      const part = (weightOf(d) / totalWeight) * deficit * envShare;
      base += part;
      const label = AUDIT_DIMENSION_LABELS[d];
      drivers.push({
        key: `audit:${d}`,
        label,
        contribution: part * multiplier * 100,
        detail:
          d === trigger && archetype
            ? `Your audit rates ${label.toLowerCase()} at ${pct(1 - deficit)}. For ${archetype.name}, this is the primary burnout trigger (${archetype.toxicityTrigger.label}), so it counts double.`
            : `Your audit rates ${label.toLowerCase()} at ${pct(1 - deficit)}.`,
      });
    }
  }

  let trend: RiskTrend | null = null;
  let bonus = 0;
  if (recent.length >= 2 && prior.length >= 2) {
    const delta = mean(recent.map(strainOf)) - mean(prior.map(strainOf));
    trend = delta > TREND_THRESHOLD ? "rising" : delta < -TREND_THRESHOLD ? "falling" : "steady";
    if (trend === "rising") {
      bonus = Math.min(delta * TREND_BONUS_RATE, TREND_BONUS_CAP);
      drivers.push({
        key: "trend",
        label: "Rising strain",
        contribution: bonus * 100,
        detail: `Your daily strain is up ${Math.round(delta * 100)} points on the week before.`,
      });
    }
  }

  const score = Math.round(clamp01(base * multiplier + bonus) * 100);
  const status: RiskStatus = recent.length >= 3 ? "ok" : "provisional";

  return {
    model: RISK_MODEL_VERSION,
    score,
    band: BANDS.find((b) => score < b.max)!.band,
    status,
    trend,
    drivers: drivers
      .filter((d) => d.contribution >= 1)
      .map((d) => ({ ...d, contribution: round(d.contribution, 1) }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 4),
    series,
    checkInsLast7: recent.length,
  };
}

// --- Helpers ---------------------------------------------------------------

function signalsOf(c: CheckIn): Record<CheckInSignal, number> {
  return {
    stress: (c.stress - 1) / 4,
    exhaustion: (5 - c.energy) / 4,
    workload: (c.workload - 1) / 4,
    lowControl: (5 - c.control) / 4,
  };
}

/** 0 = no strain, 1 = maximum strain on every check-in item. */
export function strainOf(c: CheckIn): number {
  const s = signalsOf(c);
  return (Object.keys(CHECKIN_WEIGHTS) as CheckInSignal[]).reduce(
    (sum, k) => sum + CHECKIN_WEIGHTS[k] * s[k],
    0,
  );
}

/** Audit health is 0.2 (all lowest answers) … 1.0; rescale to a 0..1 deficit. */
function auditDeficit(health: number): number {
  return clamp01(1 - (health - 0.2) / 0.8);
}

function susceptibility(traits?: RiskTraits | null): number {
  if (!traits) return 1;
  const n = traits.N ?? 0.5;
  const s = traits.S ?? 0.5;
  const a = traits.A ?? 0.5;
  return 0.85 + 0.3 * (0.5 * n + 0.25 * s + 0.25 * a);
}

function dayMs(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function shiftDate(date: string, days: number): string {
  return new Date(dayMs(date) + days * 86_400_000).toISOString().slice(0, 10);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function round(x: number, places: number): number {
  const f = 10 ** places;
  return Math.round(x * f) / f;
}

function pct(x: number): string {
  return `${Math.round(clamp01(x) * 100)}%`;
}
