import { describe, expect, it } from "vitest";
import { computeBurnoutRisk } from "./burnout-risk";
import { demoAuditResponses, demoCheckIns, demoQuizResponses } from "./demo-seed";
import { evaluate, QUESTIONS } from "./quiz";
import { AUDIT_QUESTIONS, scoreAudit } from "./workplace-audit";

const TODAY = "2026-10-28";

describe("demo seed", () => {
  it("answers every quiz and audit question with a valid 1–5 value", () => {
    const quiz = demoQuizResponses();
    const audit = demoAuditResponses();
    expect(Object.keys(quiz).sort()).toEqual(QUESTIONS.map((q) => q.id).sort());
    expect(Object.keys(audit).sort()).toEqual(AUDIT_QUESTIONS.map((q) => q.id).sort());
    for (const v of [...Object.values(quiz), ...Object.values(audit)]) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it("leaves today free and never dates a check-in in the future", () => {
    const dates = demoCheckIns(TODAY).map((c) => c.date);
    expect(dates).not.toContain(TODAY);
    expect(dates.every((d) => d < TODAY)).toBe(true);
  });

  it("produces a confident, rising, explainable risk score", () => {
    const quiz = evaluate(demoQuizResponses());
    const { dimensions } = scoreAudit(demoAuditResponses());
    const risk = computeBurnoutRisk({
      today: TODAY,
      checkIns: demoCheckIns(TODAY),
      audit: dimensions,
      archetypeSlug: quiz.archetypeSlug,
      traits: quiz.dimensions,
    });
    expect(risk.status).toBe("ok");
    expect(risk.trend).toBe("rising");
    expect(quiz.archetypeSlug).toBe("sentinel");
    expect(risk.band).toBe("elevated");
    expect(risk.drivers.some((d) => d.key === "audit:autonomy")).toBe(true);
    expect(risk.drivers.length).toBeGreaterThanOrEqual(3);
  });
});
