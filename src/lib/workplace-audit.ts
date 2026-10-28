// 5-dimension workplace toxicity audit — client-safe.

export type AuditDimension =
  | "autonomy"
  | "psychological_safety"
  | "workload"
  | "recognition"
  | "purpose";

export type AuditQuestion = {
  id: string;
  dimension: AuditDimension;
  prompt: string;
  reverse?: boolean;
};

export const AUDIT_LIKERT = [
  { value: 1, label: "Never" },
  { value: 2, label: "Rarely" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Often" },
  { value: 5, label: "Always" },
] as const;

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  { id: "a1", dimension: "autonomy", prompt: "I can decide how to do my work without asking permission." },
  { id: "a2", dimension: "autonomy", prompt: "My input is asked for before decisions that affect me." },
  { id: "s1", dimension: "psychological_safety", prompt: "I can disagree with my manager without fear of consequences." },
  { id: "s2", dimension: "psychological_safety", prompt: "Mistakes are treated as learning, not blame." },
  { id: "w1", dimension: "workload", prompt: "My workload is recoverable — I can rest and come back sharp.", reverse: false },
  { id: "w2", dimension: "workload", prompt: "I regularly work past capacity to keep up.", reverse: true },
  { id: "r1", dimension: "recognition", prompt: "My contributions are seen and named accurately." },
  { id: "r2", dimension: "recognition", prompt: "Credit for my work is often taken by others.", reverse: true },
  { id: "p1", dimension: "purpose", prompt: "The work I do connects to something I care about." },
  { id: "p2", dimension: "purpose", prompt: "I understand why my role matters to the mission." },
];

export const AUDIT_DIMENSION_LABELS: Record<AuditDimension, string> = {
  autonomy: "Autonomy",
  psychological_safety: "Psychological Safety",
  workload: "Workload Sustainability",
  recognition: "Recognition",
  purpose: "Purpose Alignment",
};

export type AuditScores = Record<AuditDimension, number>;

export function scoreAudit(responses: Record<string, number>): {
  dimensions: AuditScores;
  toxicity: number;
} {
  const dims: AuditDimension[] = [
    "autonomy",
    "psychological_safety",
    "workload",
    "recognition",
    "purpose",
  ];
  const dimensions = {} as AuditScores;
  for (const d of dims) {
    const items = AUDIT_QUESTIONS.filter((q) => q.dimension === d);
    const total = items.reduce((sum, q) => {
      const raw = responses[q.id] ?? 3;
      const norm = q.reverse ? 6 - raw : raw;
      return sum + norm;
    }, 0);
    // Normalize 0..1 (higher = healthier)
    dimensions[d] = +(total / (items.length * 5)).toFixed(4);
  }
  const avg =
    Object.values(dimensions).reduce((a, b) => a + b, 0) / dims.length;
  // toxicity = inverse of health (0 = healthy, 1 = toxic)
  const toxicity = +(1 - avg).toFixed(4);
  return { dimensions, toxicity };
}
