// Quiz definitions and scoring — client-safe module, also imported by server functions.
import { ARCHETYPES } from "@/data/archetypes";

export type Dimension = "C" | "O" | "N" | "S" | "A" | "D";
// C = Conscientiousness, O = Openness, N = Neuroticism (emotional reactivity),
// S = Environmental Sensitivity, A = Affiliation (agreeableness/harmony-seeking),
// D = Drive (assertiveness, appetite for confrontation and momentum).

export type QuizQuestion = {
  id: string;
  dimension: Dimension;
  prompt: string;
  /** if true, higher agreement = lower dimension score (inverted item). */
  reverse?: boolean;
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  C: "Conscientiousness",
  O: "Openness",
  N: "Emotional Reactivity",
  S: "Environmental Sensitivity",
  A: "Affiliation",
  D: "Drive",
};

export const LIKERT = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
] as const;

// 30 items — 5 per dimension. ~3 minutes at ~6s per item.
export const QUESTIONS: QuizQuestion[] = [
  // Conscientiousness
  { id: "c1", dimension: "C", prompt: "I finish what I start, even when it stops being exciting." },
  { id: "c2", dimension: "C", prompt: "Systems and routines make my best work possible." },
  { id: "c3", dimension: "C", prompt: "I often leave tasks half-done and move on.", reverse: true },
  { id: "c4", dimension: "C", prompt: "Before I begin, I map the sequence of steps and the likely failure points." },
  { id: "c5", dimension: "C", prompt: "Deadlines set by other people are more like guidelines to me.", reverse: true },
  // Openness
  { id: "o1", dimension: "O", prompt: "I get restless if I can't try something new for a while." },
  { id: "o2", dimension: "O", prompt: "Abstract ideas and possibilities excite me more than execution details." },
  { id: "o3", dimension: "O", prompt: "I prefer proven methods over untested ones.", reverse: true },
  { id: "o4", dimension: "O", prompt: "I notice patterns between fields that other people treat as unrelated." },
  { id: "o5", dimension: "O", prompt: "A radical rewrite of how we work sounds more energising than frightening." },
  // Neuroticism (emotional reactivity)
  { id: "n1", dimension: "N", prompt: "Small setbacks at work stay with me long after they happen." },
  { id: "n2", dimension: "N", prompt: "I replay conversations in my head, worrying I said the wrong thing." },
  { id: "n3", dimension: "N", prompt: "I stay steady and unbothered when things go sideways.", reverse: true },
  { id: "n4", dimension: "N", prompt: "Ambiguity about my standing at work occupies my attention." },
  { id: "n5", dimension: "N", prompt: "I hold myself to a standard that I rarely feel I have met." },
  // Environmental Sensitivity
  { id: "s1", dimension: "S", prompt: "I pick up on the mood of a room within minutes of walking in." },
  { id: "s2", dimension: "S", prompt: "A tense team dynamic affects my ability to think clearly." },
  { id: "s3", dimension: "S", prompt: "Other people's stress rarely rubs off on me.", reverse: true },
  { id: "s4", dimension: "S", prompt: "I can sense when something is wrong between two colleagues before anyone says it." },
  { id: "s5", dimension: "S", prompt: "Noisy, chaotic, or hostile environments visibly drain my energy." },
  // Affiliation (agreeableness / harmony-seeking)
  { id: "a1", dimension: "A", prompt: "I would rather absorb an unfair workload than create friction." },
  { id: "a2", dimension: "A", prompt: "People come to me when they need to be heard rather than fixed." },
  { id: "a3", dimension: "A", prompt: "I say what I think even when it will clearly upset someone.", reverse: true },
  { id: "a4", dimension: "A", prompt: "Protecting the team's morale is part of how I measure my own performance." },
  { id: "a5", dimension: "A", prompt: "I find it hard to say no when a colleague asks for my time." },
  // Drive (assertiveness, momentum, appetite for confrontation)
  { id: "d1", dimension: "D", prompt: "When a decision stalls, I push it forward myself." },
  { id: "d2", dimension: "D", prompt: "I am comfortable challenging a senior person in front of others." },
  { id: "d3", dimension: "D", prompt: "I would rather wait for consensus than force a call.", reverse: true },
  { id: "d4", dimension: "D", prompt: "I feel a physical impatience when work moves slower than it needs to." },
  { id: "d5", dimension: "D", prompt: "I actively seek responsibility for outcomes other people are avoiding." },
];

export type Responses = Record<string, number>;
export type DimensionScores = Record<Dimension, number>; // normalized 0..1

// Target signatures for each archetype (0..1 on each dimension).
const SIGNATURES: Record<string, DimensionScores> = {
  sentinel:      { C: 0.92, O: 0.25, N: 0.45, S: 0.50, A: 0.45, D: 0.55 },
  visionary:     { C: 0.30, O: 0.95, N: 0.45, S: 0.55, A: 0.50, D: 0.70 },
  harmonizer:    { C: 0.55, O: 0.55, N: 0.50, S: 0.90, A: 0.92, D: 0.25 },
  perfectionist: { C: 0.88, O: 0.55, N: 0.82, S: 0.70, A: 0.45, D: 0.45 },
  rebel:         { C: 0.35, O: 0.85, N: 0.55, S: 0.30, A: 0.20, D: 0.88 },
  anchor:        { C: 0.80, O: 0.30, N: 0.18, S: 0.50, A: 0.70, D: 0.35 },
  explorer:      { C: 0.50, O: 0.88, N: 0.30, S: 0.55, A: 0.55, D: 0.60 },
  guardian:      { C: 0.80, O: 0.30, N: 0.50, S: 0.80, A: 0.85, D: 0.40 },
  alchemist:     { C: 0.35, O: 0.82, N: 0.75, S: 0.88, A: 0.65, D: 0.40 },
  strategist:    { C: 0.88, O: 0.75, N: 0.38, S: 0.30, A: 0.35, D: 0.70 },
  catalyst:      { C: 0.45, O: 0.75, N: 0.40, S: 0.60, A: 0.55, D: 0.92 },
  sage:          { C: 0.70, O: 0.70, N: 0.25, S: 0.72, A: 0.75, D: 0.22 },
};

const DIMENSION_KEYS: Dimension[] = ["C", "O", "N", "S", "A", "D"];

export function computeDimensionScores(responses: Responses): DimensionScores {
  const buckets: Record<Dimension, number[]> = { C: [], O: [], N: [], S: [], A: [], D: [] };
  for (const q of QUESTIONS) {
    const raw = responses[q.id];
    if (raw == null) continue;
    const value = q.reverse ? 6 - raw : raw; // invert 1..5
    buckets[q.dimension].push((value - 1) / 4); // normalize to 0..1
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5);
  return {
    C: avg(buckets.C),
    O: avg(buckets.O),
    N: avg(buckets.N),
    S: avg(buckets.S),
    A: avg(buckets.A),
    D: avg(buckets.D),
  };
}

export type ScoredArchetype = { slug: string; score: number };

export function scoreArchetypes(dims: DimensionScores): ScoredArchetype[] {
  const results = Object.entries(SIGNATURES).map(([slug, sig]) => {
    const diffs = DIMENSION_KEYS.map((k) => Math.abs((dims[k] ?? 0.5) - sig[k]));
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return { slug, score: 1 - meanDiff };
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}

export type QuizResult = {
  archetypeSlug: string;
  confidence: number;
  dimensions: DimensionScores;
  ranked: ScoredArchetype[];
};

export function evaluate(responses: Responses): QuizResult {
  const dims = computeDimensionScores(responses);
  const ranked = scoreArchetypes(dims);
  const top = ranked[0];
  const second = ranked[1];
  const margin = top.score - second.score;
  const confidence = Math.max(0, Math.min(1, 0.5 * top.score + 0.5 * (0.5 + margin * 2)));
  return { archetypeSlug: top.slug, confidence, dimensions: dims, ranked };
}

export function getArchetypeMeta(slug: string) {
  return ARCHETYPES.find((a) => a.slug === slug);
}

/** Distance between two archetype signatures (0..1). Higher = more opposed. */
export function archetypeDistance(a: string, b: string): number {
  const sa = SIGNATURES[a];
  const sb = SIGNATURES[b];
  if (!sa || !sb) return 0;
  return DIMENSION_KEYS.reduce((acc, k) => acc + Math.abs(sa[k] - sb[k]), 0) / DIMENSION_KEYS.length;
}

/**
 * "Know your nemesis" — the archetypes whose psychological signature most
 * contradicts the given one. These are the profiles most likely to trigger
 * friction, and therefore the most valuable to study.
 */
export function nemesisArchetypes(slug: string, count = 3): string[] {
  if (!SIGNATURES[slug]) return [];
  return Object.keys(SIGNATURES)
    .filter((s) => s !== slug)
    .map((s) => ({ s, d: archetypeDistance(slug, s) }))
    .sort((x, y) => y.d - x.d)
    .slice(0, count)
    .map((x) => x.s);
}

/** Target signature (0..1 per dimension) for an archetype, for radar comparison. */
export function archetypeSignature(slug: string): DimensionScores | null {
  return SIGNATURES[slug] ?? null;
}
