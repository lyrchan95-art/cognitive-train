import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/site/AppShell";
import { TEAM_PRICE_HKD_PER_SEAT } from "@/lib/legal";
import { submitPilotRequest, TEAM_SIZES } from "@/lib/pilot-requests.functions";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "For Teams — The Cognitive Atelier" },
      {
        name: "description",
        content:
          "A free 6-week burnout early-warning pilot for Hong Kong SMEs and startups of 20–200 people. Aggregate team reports only — never individual answers.",
      },
      { property: "og:title", content: "Burnout early-warning for Hong Kong teams" },
      {
        property: "og:description",
        content: "Run a free 6-week pilot. Aggregate team reports only — never individual answers.",
      },
    ],
  }),
  component: TeamsPage,
});

const PILOT_STEPS = [
  {
    n: "Week 0",
    t: "Set-up",
    d: "A 30-minute call with our founding team. We agree the teams involved and what you want to learn.",
  },
  {
    n: "Week 1",
    t: "Baseline",
    d: "Each person takes the 3-minute assessment and the workplace audit, privately.",
  },
  {
    n: "Weeks 2–6",
    t: "Daily signal",
    d: "Thirty-second daily check-ins. Each person sees their own burnout-risk score and what drives it.",
  },
  {
    n: "Weekly",
    t: "Team report",
    d: "You receive an aggregate report: where workload, safety or recognition is slipping, and what to try.",
  },
];

const PRIVACY = [
  "Employers never see an individual's answers, check-ins or risk score.",
  "Team reports are aggregate only, and groups smaller than five are never reported on.",
  "Each person can download or delete their own data at any time.",
];

function TeamsPage() {
  return (
    <AppShell>
      <section className="container-page pt-20 pb-12 md:pt-28">
        <p className="eyebrow">For teams</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl font-bold leading-tight md:text-6xl">
          Catch burnout in your team before it turns into turnover.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">
          For Hong Kong SMEs and startups of 20–200 people. Run a free 6-week pilot and see where
          strain is building — while there is still time to act.
        </p>
      </section>

      <section className="border-y border-border/60 bg-paper-dark/40">
        <div className="container-page py-16">
          <p className="eyebrow">How the pilot works</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILOT_STEPS.map((s) => (
              <div key={s.t} className="card-paper p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">{s.n}</p>
                <p className="mt-3 font-serif text-xl font-bold">{s.t}</p>
                <p className="mt-2 text-sm text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow">Privacy by design</p>
          <h2 className="mt-3 font-serif text-3xl font-bold">
            People speak honestly only when it's safe to.
          </h2>
          <ul className="mt-6 space-y-3 text-ink-soft">
            {PRIVACY.map((p) => (
              <li key={p} className="flex gap-3">
                <span className="text-accent">◆</span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-muted">
            Curious how the risk score works?{" "}
            <Link to="/methodology" className="font-medium text-accent hover:underline">
              Read the methodology →
            </Link>
          </p>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <PilotForm />
        </div>
      </section>
    </AppShell>
  );
}

function PilotForm() {
  const submit = useServerFn(submitPilotRequest);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    teamSize: "" as (typeof TEAM_SIZES)[number] | "",
    message: "",
    website: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          ...form,
          teamSize: form.teamSize as (typeof TEAM_SIZES)[number],
          website: form.website || undefined,
          message: form.message || undefined,
        },
      }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (mutation.isSuccess) {
    return (
      <div id="pilot" className="card-paper p-8">
        <p className="eyebrow">Request received</p>
        <p className="mt-3 font-serif text-2xl font-bold">Thank you — we'll be in touch.</p>
        <p className="mt-2 text-sm text-ink-soft">
          A founder will email you within two working days to arrange the set-up call.
        </p>
      </div>
    );
  }

  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  return (
    <form id="pilot" onSubmit={onSubmit} className="card-paper space-y-4 p-8">
      <div>
        <p className="eyebrow">Request a pilot</p>
        <p className="mt-2 font-serif text-2xl font-bold">Free for 6 weeks.</p>
        <p className="mt-1 text-sm text-ink-muted">
          Then HK${TEAM_PRICE_HKD_PER_SEAT} per person per month if you continue. No obligation.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pilot-name" className="eyebrow mb-1 block">
            Name
          </label>
          <input
            id="pilot-name"
            required
            maxLength={120}
            className={field}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="pilot-email" className="eyebrow mb-1 block">
            Work email
          </label>
          <input
            id="pilot-email"
            type="email"
            required
            maxLength={200}
            className={field}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="pilot-company" className="eyebrow mb-1 block">
            Company
          </label>
          <input
            id="pilot-company"
            required
            maxLength={160}
            className={field}
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="pilot-size" className="eyebrow mb-1 block">
            Team size
          </label>
          <select
            id="pilot-size"
            required
            className={field}
            value={form.teamSize}
            onChange={(e) =>
              setForm({ ...form, teamSize: e.target.value as (typeof TEAM_SIZES)[number] })
            }
          >
            <option value="" disabled>
              Select…
            </option>
            {TEAM_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="pilot-message" className="eyebrow mb-1 block">
          What would you like to learn? (optional)
        </label>
        <textarea
          id="pilot-message"
          rows={4}
          maxLength={2000}
          className={field}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <div aria-hidden className="hidden">
        <label htmlFor="pilot-website">Website</label>
        <input
          id="pilot-website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong sending your request. Please check the fields and try again.
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {mutation.isPending ? "Sending…" : "Request a pilot"}
      </button>
    </form>
  );
}
