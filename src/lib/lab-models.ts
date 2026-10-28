// Pure, dependency-free model implementations used by the Archetype Behaviour Lab.
// Everything here operates on in-memory arrays and returns aggregates only.
// To add a model: implement a pure function here, then register it in MODEL_REGISTRY (lab.functions.ts).

import type { Dimension, DimensionScores } from "@/lib/quiz";

export const DIMS: Dimension[] = ["C", "O", "N", "S", "A", "D"];

export type Vec = number[];

/* ---------------- k-anonymity ---------------- */

export type Cell<T> = { n: number; value: T | null; suppressed: boolean };

export function kCell<T>(n: number, value: T, minCell: number): Cell<T> {
  return n >= minCell ? { n, value, suppressed: false } : { n, value: null, suppressed: true };
}

export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return m;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

/* ---------------- k-means ---------------- */

function dist2(a: Vec, b: Vec) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

/** Deterministic PRNG so runs are reproducible for a given seed. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function kmeans(points: Vec[], k: number, seed = 42, iters = 50) {
  const rand = mulberry32(seed);
  const n = points.length;
  if (n === 0) return { centroids: [] as Vec[], labels: [] as number[], inertia: 0 };
  // k-means++ init
  const centroids: Vec[] = [points[Math.floor(rand() * n)].slice()];
  while (centroids.length < k) {
    const d = points.map((p) => Math.min(...centroids.map((c) => dist2(p, c))));
    const total = d.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let idx = 0;
    for (; idx < n - 1; idx++) { r -= d[idx]; if (r <= 0) break; }
    centroids.push(points[idx].slice());
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    const next = points.map((p) => {
      let best = 0, bd = Infinity;
      centroids.forEach((c, ci) => { const d = dist2(p, c); if (d < bd) { bd = d; best = ci; } });
      return best;
    });
    const changed = next.some((l, i) => l !== labels[i]);
    labels = next;
    for (let ci = 0; ci < k; ci++) {
      const members = points.filter((_, i) => labels[i] === ci);
      if (!members.length) continue;
      centroids[ci] = members[0].map((_, d) => mean(members.map((m) => m[d])));
    }
    if (!changed) break;
  }
  const inertia = points.reduce((s, p, i) => s + dist2(p, centroids[labels[i]]), 0);
  return { centroids, labels, inertia };
}

export function silhouette(points: Vec[], labels: number[]) {
  const n = points.length;
  if (n < 3) return 0;
  const byLabel = groupBy(points.map((p, i) => ({ p, l: labels[i] })), (r) => String(r.l));
  const scores: number[] = [];
  for (let i = 0; i < n; i++) {
    const own = byLabel.get(String(labels[i]))!.filter((r) => r.p !== points[i]);
    if (!own.length) { scores.push(0); continue; }
    const a = mean(own.map((r) => Math.sqrt(dist2(points[i], r.p))));
    let b = Infinity;
    for (const [l, rows] of byLabel) {
      if (l === String(labels[i])) continue;
      b = Math.min(b, mean(rows.map((r) => Math.sqrt(dist2(points[i], r.p)))));
    }
    if (!isFinite(b)) { scores.push(0); continue; }
    scores.push((b - a) / Math.max(a, b));
  }
  return mean(scores);
}

/* ---------------- confusion matrix ---------------- */

export function confusionMatrix(pairs: { actual: string; predicted: string }[], labels: string[]) {
  const idx = new Map(labels.map((l, i) => [l, i]));
  const m = labels.map(() => labels.map(() => 0));
  for (const p of pairs) {
    const a = idx.get(p.actual), b = idx.get(p.predicted);
    if (a == null || b == null) continue;
    m[a][b]++;
  }
  const correct = labels.reduce((s, _, i) => s + m[i][i], 0);
  return { labels, matrix: m, accuracy: pairs.length ? correct / pairs.length : 0 };
}

/* ---------------- Kaplan–Meier ---------------- */

/** durations in days, event=true if the user churned (observed drop-off), false if still active (censored). */
export function kaplanMeier(obs: { t: number; event: boolean }[], maxT = 60) {
  const sorted = [...obs].sort((a, b) => a.t - b.t);
  let atRisk = sorted.length;
  let surv = 1;
  const curve: { t: number; s: number; atRisk: number }[] = [{ t: 0, s: 1, atRisk }];
  const times = [...new Set(sorted.filter((o) => o.event).map((o) => o.t))].sort((a, b) => a - b);
  for (const t of times) {
    if (t > maxT) break;
    const d = sorted.filter((o) => o.t === t && o.event).length;
    atRisk = sorted.filter((o) => o.t >= t).length;
    if (atRisk === 0) break;
    surv *= 1 - d / atRisk;
    curve.push({ t, s: round(surv), atRisk });
  }
  const median = curve.find((c) => c.s <= 0.5)?.t ?? null;
  return { curve, median, n: obs.length };
}

/* ---------------- dimension vector helpers ---------------- */

export function dimsToVec(d: Partial<DimensionScores> | null | undefined): Vec {
  return DIMS.map((k) => Number(d?.[k] ?? 0.5));
}

/** toxicity_score is stored 0..1 (0 = healthy). */
export function toxicityBand(score: number) {
  if (score < 0.3) return "healthy";
  if (score < 0.55) return "strained";
  if (score < 0.75) return "toxic";
  return "critical";
}
export const TOXICITY_BANDS = ["healthy", "strained", "toxic", "critical"] as const;
