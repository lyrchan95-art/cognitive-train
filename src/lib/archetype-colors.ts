// Maps archetype slugs to their CSS accent tokens (defined in src/styles.css).
export const archetypeColor = (slug: string) => `var(--arch-${slug}, var(--chart-3))`;

export const BAND_COLORS: Record<string, string> = {
  healthy: "var(--chart-4)",
  strained: "var(--chart-2)",
  toxic: "var(--chart-1)",
  critical: "var(--destructive)",
};

export const CLUSTER_COLORS = [
  "var(--arch-sentinel)", "var(--arch-visionary)", "var(--arch-harmonizer)", "var(--arch-perfectionist)",
  "var(--arch-rebel)", "var(--arch-anchor)", "var(--arch-explorer)", "var(--arch-guardian)",
  "var(--arch-alchemist)", "var(--arch-strategist)", "var(--arch-catalyst)", "var(--arch-sage)",
];
