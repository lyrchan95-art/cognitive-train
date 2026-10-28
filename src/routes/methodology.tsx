import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/site/AppShell";
import { ARCHETYPES } from "@/data/archetypes";
import {
  BANDS,
  CHECKIN_WEIGHTS,
  ENV_SHARE,
  RISK_MODEL_VERSION,
  STRAIN_SHARE,
  TREND_BONUS_CAP,
  TREND_THRESHOLD,
  TRIGGER_DIMENSION,
  TRIGGER_WEIGHT,
} from "@/lib/burnout-risk";
import { DIMENSION_LABELS } from "@/lib/quiz";
import { AUDIT_DIMENSION_LABELS } from "@/lib/workplace-audit";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "How the burnout-risk score is calculated: inputs, weights, archetype triggers, limitations and our validation plan.",
      },
      { property: "og:title", content: "How the burnout-risk score works" },
      {
        property: "og:description",
        content: "Every input and weight in our burnout-risk model, published.",
      },
    ],
  }),
  component: MethodologyPage,
});

const CHECKIN_LABELS: Record<keyof typeof CHECKIN_WEIGHTS, string> = {
  stress: "Stress (1 calm … 5 very stressed)",
  exhaustion: "Low energy (5 energised … 1 drained)",
  workload: "Workload (1 light … 5 overwhelming)",
  lowControl: "Low control (5 full … 1 none)",
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

function MethodologyPage() {
  return (
    <AppShell>
      <article className="container-page pt-20 pb-24 md:pt-28">
        <p className="eyebrow">Methodology · model {RISK_MODEL_VERSION}</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl font-bold leading-tight md:text-6xl">
          How the burnout-risk score works.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          We publish every input and weight, so you can see exactly why your score is what it is —
          and challenge it.
        </p>

        <div className="mt-10 max-w-3xl rounded-xl border-2 border-dashed border-ink p-6 text-sm leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">What this is — and isn't</p>
          <p className="mt-2">
            The score is a wellbeing signal to help people and teams notice rising strain early. It
            is not a medical or psychological diagnosis. Version 1 is a transparent, hand-weighted
            model built from established work-stress factors; its weights have not yet been fitted
            to outcome data. We will re-fit and publish them as pilot data accumulates (see{" "}
            <a href="#validation" className="text-accent hover:underline">
              validation plan
            </a>
            ).
          </p>
        </div>

        <Section n="01" title="Three inputs">
          <div className="grid gap-6 md:grid-cols-3">
            <InputCard title="Who you are" sub="30-question assessment, once">
              Six dimensions, five statements each:{" "}
              {Object.values(DIMENSION_LABELS).join(", ").toLowerCase()}. These assign one of twelve
              work archetypes, and three of them set your susceptibility (step 04).
            </InputCard>
            <InputCard title="Where you work" sub="Workplace audit, retake any time">
              Ten statements across five dimensions:{" "}
              {Object.values(AUDIT_DIMENSION_LABELS).join(", ").toLowerCase()}.
            </InputCard>
            <InputCard title="How you are today" sub="30-second daily check-in">
              Four 1–5 ratings: energy, stress, workload, and control over how you work. The last 14
              days are used.
            </InputCard>
          </div>
        </Section>

        <Section n="02" title="Daily strain">
          <p>
            Each check-in becomes a strain value from 0 to 1. The score uses the average over the
            last 7 days.
          </p>
          <Table
            head={["Signal", "Weight"]}
            rows={(Object.keys(CHECKIN_WEIGHTS) as (keyof typeof CHECKIN_WEIGHTS)[]).map((k) => [
              CHECKIN_LABELS[k],
              pct(CHECKIN_WEIGHTS[k]),
            ])}
          />
        </Section>

        <Section n="03" title="Workplace pressure — weighted by archetype">
          <p>
            Each audit dimension becomes a deficit from 0 (healthy) to 1. The dimension that matches
            your archetype's burnout trigger counts {TRIGGER_WEIGHT}× — the same pressure breaks
            different people in different ways.
          </p>
          <Table
            head={["Archetype", "Burnout trigger", "Audit dimension weighted ×" + TRIGGER_WEIGHT]}
            rows={ARCHETYPES.map((a) => [
              a.name,
              a.toxicityTrigger.label,
              AUDIT_DIMENSION_LABELS[TRIGGER_DIMENSION[a.slug]],
            ])}
          />
        </Section>

        <Section n="04" title="Combining the signals">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Base = {pct(STRAIN_SHARE)} daily strain + {pct(ENV_SHARE)} workplace pressure. With
              only one input available, that input is used alone and the score is marked
              provisional.
            </li>
            <li>
              Susceptibility multiplier from ×0.85 to ×1.15, driven by emotional reactivity (half
              the weight), environmental sensitivity and affiliation (a quarter each).
            </li>
            <li>
              Trend: if average strain this week is more than {Math.round(TREND_THRESHOLD * 100)}{" "}
              points above the week before, up to {Math.round(TREND_BONUS_CAP * 100)} points are
              added. Falling strain is shown but never subtracts.
            </li>
            <li>The result is scaled to 0–100. The largest contributors are listed as drivers.</li>
          </ol>
          <Table
            head={["Score", "Band"]}
            rows={BANDS.map((b, i) => [
              `${i === 0 ? 0 : BANDS[i - 1].max}–${Number.isFinite(b.max) ? b.max - 1 : 100}`,
              b.band[0].toUpperCase() + b.band.slice(1),
            ])}
          />
          <p className="text-sm text-ink-muted">
            A score is provisional until there are at least 3 check-ins in the last 7 days.
          </p>
        </Section>

        <Section n="05" title="Limitations">
          <ul className="list-disc space-y-2 pl-5">
            <li>All inputs are self-reported, and can be affected by mood on the day.</li>
            <li>Version 1 weights are set by judgement, not yet fitted to outcomes.</li>
            <li>
              The assessment's reliability and the archetype assignment have not yet been
              independently validated.
            </li>
            <li>
              The score describes risk signals, not a condition. It must never be used for hiring,
              performance or disciplinary decisions.
            </li>
          </ul>
        </Section>

        <Section n="06" title="Validation plan" id="validation">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Publish the assessment's internal consistency per dimension and its two-week
              test–retest stability.
            </li>
            <li>
              Check the risk score against an established burnout questionnaire collected alongside
              pilot check-ins.
            </li>
            <li>
              Re-fit the weights on pilot data and publish each new model version, with its results,
              on this page.
            </li>
          </ul>
        </Section>

        <p className="mt-16 text-sm text-ink-muted">
          Questions about the method?{" "}
          <Link to="/teams" className="font-medium text-accent hover:underline">
            Get in touch →
          </Link>
        </p>
      </article>
    </AppShell>
  );
}

function Section({
  n,
  title,
  id,
  children,
}: {
  n: string;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-16 max-w-3xl scroll-mt-24">
      <p className="font-mono text-sm text-accent">{n}</p>
      <h2 className="mt-2 font-serif text-3xl font-bold">{title}</h2>
      <div className="mt-4 space-y-4 text-ink-soft">{children}</div>
    </section>
  );
}

function InputCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="card-paper p-6">
      <p className="font-serif text-xl font-bold text-ink">{title}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-ink-muted">{sub}</p>
      <p className="mt-3 text-sm">{children}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4 font-semibold text-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.join("|")} className="border-b border-border/60">
              {r.map((c, i) => (
                <td key={i} className="py-2 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
