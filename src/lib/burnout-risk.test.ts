import { describe, expect, it } from "vitest";
import { computeBurnoutRisk, type CheckIn } from "./burnout-risk";
import type { AuditScores } from "./workplace-audit";

const TODAY = "2026-10-28";

function daysAgo(n: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function week(values: Omit<CheckIn, "date">, startDaysAgo = 0, count = 7): CheckIn[] {
  return Array.from({ length: count }, (_, i) => ({ date: daysAgo(startDaysAgo + i), ...values }));
}

const CALM = { energy: 5, stress: 1, workload: 1, control: 5 } as const;
const STRAINED = { energy: 1, stress: 5, workload: 5, control: 1 } as const;
const MIDDLING = { energy: 3, stress: 3, workload: 3, control: 3 } as const;

const HEALTHY_AUDIT: AuditScores = {
  autonomy: 1,
  psychological_safety: 1,
  workload: 1,
  recognition: 1,
  purpose: 1,
};
const MID_AUDIT: AuditScores = {
  autonomy: 0.6,
  psychological_safety: 0.6,
  workload: 0.6,
  recognition: 0.6,
  purpose: 0.6,
};

describe("computeBurnoutRisk", () => {
  it("returns insufficient with no recent check-ins and no audit", () => {
    const r = computeBurnoutRisk({ today: TODAY, checkIns: week(STRAINED, 10) });
    expect(r.status).toBe("insufficient");
    expect(r.score).toBeNull();
    expect(r.band).toBeNull();
  });

  it("scores calm check-ins in a healthy workplace as low", () => {
    const r = computeBurnoutRisk({ today: TODAY, checkIns: week(CALM), audit: HEALTHY_AUDIT });
    expect(r.status).toBe("ok");
    expect(r.band).toBe("low");
    expect(r.score).toBeLessThan(10);
  });

  it("scores sustained maximum strain as high", () => {
    const r = computeBurnoutRisk({
      today: TODAY,
      checkIns: week(STRAINED),
      audit: {
        autonomy: 0.2,
        psychological_safety: 0.2,
        workload: 0.2,
        recognition: 0.2,
        purpose: 0.2,
      },
    });
    expect(r.band).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("is provisional with fewer than three check-ins in the last 7 days", () => {
    const r = computeBurnoutRisk({ today: TODAY, checkIns: week(MIDDLING, 0, 2) });
    expect(r.status).toBe("provisional");
    expect(r.score).not.toBeNull();
  });

  it("is provisional when only the audit is available", () => {
    const r = computeBurnoutRisk({ today: TODAY, checkIns: [], audit: MID_AUDIT });
    expect(r.status).toBe("provisional");
    expect(r.score).toBe(50);
  });

  it("ignores check-ins dated in the future", () => {
    const r = computeBurnoutRisk({
      today: TODAY,
      checkIns: [{ date: "2026-11-02", ...STRAINED }],
    });
    expect(r.status).toBe("insufficient");
  });

  it("raises the score for people with higher emotional reactivity", () => {
    const base = { today: TODAY, checkIns: week(MIDDLING), audit: MID_AUDIT };
    const steady = computeBurnoutRisk({ ...base, traits: { N: 0, S: 0, A: 0 } });
    const reactive = computeBurnoutRisk({ ...base, traits: { N: 1, S: 1, A: 1 } });
    expect(reactive.score!).toBeGreaterThan(steady.score!);
  });

  it("weights the audit dimension that matches the archetype's trigger", () => {
    const lowAutonomy: AuditScores = { ...HEALTHY_AUDIT, autonomy: 0.2 };
    const lowPurpose: AuditScores = { ...HEALTHY_AUDIT, purpose: 0.2 };
    const base = { today: TODAY, checkIns: week(MIDDLING), archetypeSlug: "sentinel" };
    const hit = computeBurnoutRisk({ ...base, audit: lowAutonomy });
    const miss = computeBurnoutRisk({ ...base, audit: lowPurpose });
    expect(hit.score!).toBeGreaterThan(miss.score!);
    const autonomyDriver = hit.drivers.find((d) => d.key === "audit:autonomy");
    expect(autonomyDriver?.detail).toMatch(/Sentinel/);
  });

  it("flags rising strain and adds to the score", () => {
    const rising = [...week(MIDDLING, 0, 4), ...week(CALM, 7, 4)];
    const flat = week(MIDDLING, 0, 4);
    const r = computeBurnoutRisk({ today: TODAY, checkIns: rising });
    const f = computeBurnoutRisk({ today: TODAY, checkIns: flat });
    expect(r.trend).toBe("rising");
    expect(r.score!).toBeGreaterThan(f.score!);
    expect(r.drivers.some((d) => d.key === "trend")).toBe(true);
  });

  it("flags falling strain without adding to the score", () => {
    const falling = [...week(CALM, 0, 4), ...week(STRAINED, 7, 4)];
    const r = computeBurnoutRisk({ today: TODAY, checkIns: falling });
    expect(r.trend).toBe("falling");
    expect(r.score).toBe(computeBurnoutRisk({ today: TODAY, checkIns: week(CALM, 0, 4) }).score);
  });

  it("orders drivers by contribution with stress leading a stress-heavy week", () => {
    const r = computeBurnoutRisk({
      today: TODAY,
      checkIns: week({ energy: 4, stress: 5, workload: 2, control: 4 }),
    });
    expect(r.drivers[0].key).toBe("checkin:stress");
    const contributions = r.drivers.map((d) => d.contribution);
    expect(contributions).toEqual([...contributions].sort((a, b) => b - a));
  });

  it("returns a 14-day series with nulls for missed days", () => {
    const r = computeBurnoutRisk({ today: TODAY, checkIns: week(MIDDLING, 0, 1) });
    expect(r.series).toHaveLength(14);
    expect(r.series[13]).toEqual({ date: TODAY, strain: 0.5 });
    expect(r.series[0].strain).toBeNull();
  });
});
