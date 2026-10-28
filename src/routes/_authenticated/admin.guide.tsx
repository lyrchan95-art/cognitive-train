import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  Newspaper,
  Route as RouteIcon,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge, Panel } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/guide")({
  head: () => ({
    meta: [
      { title: "Admin Guide — Cognitive Atelier" },
      { name: "description", content: "Instructions for managing Cognitive Atelier content, pathways, research, and behavioural models." },
      { property: "og:title", content: "Admin Guide — Cognitive Atelier" },
      { property: "og:description", content: "Instructions for managing Cognitive Atelier content, pathways, research, and behavioural models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminGuide,
});

type GuideLink =
  | "/admin"
  | "/admin/archetypes"
  | "/admin/articles"
  | "/admin/pathways"
  | "/admin/research"
  | "/admin/lab"
  | "/admin/lab/datasets"
  | "/admin/lab/insights"
  | "/admin/lab/governance";

type Workflow = {
  title: string;
  summary: string;
  role: "Admin" | "Data Scientist" | "Content Editor";
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  to?: GuideLink;
  steps: string[];
  note?: string;
};

const workflows: Workflow[] = [
  {
    title: "Publish archetype cards",
    summary: "Control which archetypes appear in the public atlas.",
    role: "Admin",
    icon: BarChart3,
    to: "/admin/archetypes",
    steps: [
      "Open Archetypes and locate the card by name or slug.",
      "Review its name, tagline, headline, and icon.",
      "Switch Draft to Published. Switch it off to remove the card from the public atlas.",
    ],
  },
  {
    title: "Edit and publish articles",
    summary: "Keep feed content accurate, categorized, and ready for readers.",
    role: "Admin",
    icon: Newspaper,
    to: "/admin/articles",
    steps: [
      "Search by title, slug, or archetype tag.",
      "Select Edit to update the title, excerpt, category, or reading time, then save.",
      "Use the status switch to publish or return the article to draft.",
      "Confirm its archetype tags before publishing so personalization remains accurate.",
    ],
    note: "Publishing changes the live reader experience immediately.",
  },
  {
    title: "Maintain learning pathways",
    summary: "Edit course details and each daily lesson.",
    role: "Admin",
    icon: RouteIcon,
    to: "/admin/pathways",
    steps: [
      "Choose a pathway from the left-hand list.",
      "Use Edit beside the pathway to change its title, description, difficulty, image, or status.",
      "Select a day to update its lesson, action prompt, and reading time.",
      "Save the day, then review the learner-facing pathway before publishing.",
    ],
  },
  {
    title: "Add research",
    summary: "Publish evidence, editorials, neuroscience, and behavioural psychology.",
    role: "Admin",
    icon: BookOpen,
    to: "/admin/research",
    steps: [
      "Select New research and enter a unique lowercase slug using hyphens.",
      "Add the title, authors, category, abstract, full text, citation, and source link.",
      "Set the publication date, reading time, image, and Draft or Live status.",
      "Save, then verify the entry in the public Research Library.",
    ],
    note: "Use Delete only when an item should be permanently removed; use Draft for temporary withdrawal.",
  },
  {
    title: "Build a privacy-safe dataset",
    summary: "Create reproducible cohort snapshots from behavioural data.",
    role: "Data Scientist",
    icon: FlaskConical,
    to: "/admin/lab/datasets",
    steps: [
      "Choose a pre-built recipe, or Custom for source, grouping, metric, and archetype controls.",
      "Keep the minimum cell size at 10 unless an approved analysis requires a lower value; the hard floor is 5.",
      "Preview the table and check the suppressed-cell count. The n<k marker means a small cohort was hidden.",
      "Name and save the snapshot for reproducibility, or export the preview as CSV.",
    ],
    note: "Never infer or report information hidden by a suppressed cell.",
  },
  {
    title: "Run a behaviour model",
    summary: "Launch a versioned analysis and inspect its results.",
    role: "Data Scientist",
    icon: BarChart3,
    to: "/admin/lab",
    steps: [
      "Choose the model and, when needed, a saved dataset snapshot.",
      "Review parameters, filters, date range, and minimum cell size.",
      "Select Run model. The run detail page updates while the job is queued or running.",
      "Inspect charts and metrics, apply result filters, then export CSV, PNG, or the run JSON as needed.",
    ],
  },
  {
    title: "Record and share findings",
    summary: "Turn model output into traceable team knowledge.",
    role: "Data Scientist",
    icon: Lightbulb,
    to: "/admin/lab/insights",
    steps: [
      "Open a completed run and record the hypothesis, finding, follow-up, and useful tags.",
      "Save the insight so it appears in the searchable Insight Log.",
      "Create a read-only link only when aggregate results need external review.",
      "Treat links as time-limited access: they expire after 30 days.",
    ],
  },
  {
    title: "Promote a model",
    summary: "Move evidence-backed model versions toward production.",
    role: "Data Scientist",
    icon: ShieldCheck,
    to: "/admin/lab/governance",
    steps: [
      "Open a completed run and review its results, data snapshot, and configuration.",
      "Enter the evidence and rationale before changing its state.",
      "Move promising work from Experiment to Candidate; promote to Production only after validation.",
      "Use Governance to confirm the active production version and review the immutable audit trail.",
    ],
    note: "Only completed runs can reach Production, and only one production version is active per model.",
  },
];

const roleTone = (role: Workflow["role"]) => role === "Admin" ? "accent" : role === "Data Scientist" ? "good" : "warn";

function AdminGuide() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="eyebrow">Operating manual</p>
        <h2 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Admin Portal Guide</h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted sm:text-base">
          Follow these workflows to publish content, maintain learning experiences, and run privacy-safe behavioural analysis.
          Your navigation only shows areas available to your role.
        </p>
      </header>

      <Panel eyebrow="Start here" title="Before you make a change">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Confirm your role", "Admin manages public content. Data Scientist operates the Behaviour Lab. Content Editor uses the Content Console when enabled."],
            ["2", "Work in draft first", "Review titles, tags, source details, images, and learner actions before making content live."],
            ["3", "Verify the result", "Open the reader-facing page after saving or publishing. For model work, record evidence and findings."],
          ].map(([number, title, body]) => (
            <li key={number} className="flex gap-3 border-t border-border/60 pt-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs text-paper">{number}</span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Step by step</p>
            <h2 className="font-serif text-2xl font-bold">Common workflows</h2>
          </div>
          <p className="text-xs text-ink-muted">Select Open workspace to begin.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {workflows.map((workflow) => {
            const Icon = workflow.icon;
            return (
              <article key={workflow.title} className="card-paper flex flex-col p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-paper-dark/60 text-accent">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-xl font-bold">{workflow.title}</h3>
                      <Badge tone={roleTone(workflow.role)}>{workflow.role}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{workflow.summary}</p>
                  </div>
                </div>
                <ol className="mt-5 space-y-3">
                  {workflow.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-5 text-ink-soft">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                      <span><span className="sr-only">Step {index + 1}: </span>{step}</span>
                    </li>
                  ))}
                </ol>
                {workflow.note && <p className="mt-4 border-l-2 border-accent-gold pl-3 text-xs leading-5 text-ink-muted">{workflow.note}</p>}
                {workflow.to && (
                  <Link to={workflow.to} className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline">
                    Open workspace <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <Panel eyebrow="When something looks wrong" title="Quick checks">
        <div className="grid gap-5 md:grid-cols-2">
          <Troubleshooting title="I cannot see a workspace" body="The portal hides tools outside your assigned role. Ask an administrator to grant Admin, Data Scientist, or Content Editor access." />
          <Troubleshooting title="Content is missing publicly" body="Confirm the item is Live or Published, has the intended archetype tags, and has all required fields completed." />
          <Troubleshooting title="A model result shows n<k" body="The cohort is smaller than the privacy threshold. Broaden filters or use a larger date range; do not lower the floor below 5." />
          <Troubleshooting title="A run is still processing" body="Leave the run page open while it refreshes automatically. If it reports Failed, review the message and launch a corrected run." />
        </div>
      </Panel>
    </div>
  );
}

function Troubleshooting({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <Search className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-ink-muted">{body}</p>
      </div>
    </div>
  );
}