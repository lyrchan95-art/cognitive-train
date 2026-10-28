// Sample data for one-click demo accounts — client-safe and pure, so the seed
// can be unit-tested against the risk model.
//
// The story it tells: a conscientious, fairly reactive person in a workplace
// with low autonomy, whose strain has been climbing over the last week.

import type { CheckIn } from "./burnout-risk";
import { QUESTIONS, type Responses } from "./quiz";
import { AUDIT_QUESTIONS } from "./workplace-audit";

/** Agreement (1–5) per quiz dimension, before reverse-scored items are flipped. */
const QUIZ_PROFILE = { C: 5, O: 2, N: 4, S: 3, A: 3, D: 3 } as const;

/** Health (1–5) per audit dimension, before reverse-scored items are flipped. */
const AUDIT_PROFILE = {
  autonomy: 2,
  psychological_safety: 3,
  workload: 3,
  recognition: 4,
  purpose: 4,
} as const;

/** Days ago → check-in. Gaps are deliberate: real people miss days. */
const CHECKINS: Record<number, Omit<CheckIn, "date">> = {
  13: { energy: 4, stress: 2, workload: 3, control: 3 },
  12: { energy: 4, stress: 2, workload: 2, control: 4 },
  10: { energy: 3, stress: 3, workload: 3, control: 3 },
  9: { energy: 4, stress: 2, workload: 3, control: 3 },
  7: { energy: 3, stress: 3, workload: 3, control: 3 },
  5: { energy: 3, stress: 3, workload: 3, control: 3 },
  4: { energy: 3, stress: 3, workload: 4, control: 3 },
  3: { energy: 3, stress: 4, workload: 4, control: 3 },
  2: { energy: 2, stress: 4, workload: 4, control: 3 },
  1: { energy: 3, stress: 3, workload: 4, control: 3 },
};

function flip(value: number, reverse?: boolean): number {
  return reverse ? 6 - value : value;
}

export function demoQuizResponses(): Responses {
  return Object.fromEntries(
    QUESTIONS.map((q) => [q.id, flip(QUIZ_PROFILE[q.dimension], q.reverse)]),
  );
}

export function demoAuditResponses(): Record<string, number> {
  return Object.fromEntries(
    AUDIT_QUESTIONS.map((q) => [q.id, flip(AUDIT_PROFILE[q.dimension], q.reverse)]),
  );
}

/** Check-ins dated relative to `today` (YYYY-MM-DD). Today is left blank so the visitor can try the form. */
export function demoCheckIns(today: string): CheckIn[] {
  const base = Date.parse(`${today}T00:00:00Z`);
  return Object.entries(CHECKINS).map(([ago, c]) => ({
    date: new Date(base - Number(ago) * 86_400_000).toISOString().slice(0, 10),
    ...c,
  }));
}
