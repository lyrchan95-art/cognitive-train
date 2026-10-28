import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getContentHealth } from "@/lib/content-ops.functions";
import { ARCHETYPES } from "@/data/archetypes";
import { Badge, ErrorBox, Metric, Panel, Skeleton, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/content/health")({
  head: () => ({
    meta: [
      { title: "Content health · Content Update Console" },
      { name: "description", content: "Coverage gaps, stale essays, declining engagement and duplicate titles across the library." },
      { property: "og:title", content: "Content health" },
      { property: "og:description", content: "Coverage, staleness and duplicate checks for the essay library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HealthPage,
});

type Data = Awaited<ReturnType<typeof getContentHealth>>;

function HealthPage() {
  const load = useServerFn(getContentHealth);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => { setErr(null); load({ data: { staleMonths: 6 } }).then(setD).catch((e: Error) => setErr(e.message)); };
  useEffect(refresh, []);

  if (err) return <ErrorBox message={err} retry={refresh} />;
  if (!d) return <Panel><Skeleton rows={8} /></Panel>;

  return (
    <div className="space-y-6">
      <Panel eyebrow="Overview" title="Content health">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Live essays" value={d.totals.articles} />
          <Metric label="Archived" value={d.totals.archived} />
          <Metric label="Published pathways" value={d.totals.pathways} />
          <Metric label="Research pieces" value={d.totals.research} />
        </div>
      </Panel>

      <Panel title="Coverage by archetype" eyebrow={`minimum ${d.minimum}`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ARCHETYPES.map((a) => {
            const n = d.articlesPer[a.slug] ?? 0;
            const ok = n >= d.minimum;
            return (
              <div key={a.slug} className="rounded-lg border border-border/60 p-3">
                <p className="truncate font-mono text-[10px] uppercase tracking-widest text-ink-muted">{a.slug}</p>
                <p className={`font-mono text-lg font-semibold tabular-nums ${ok ? "" : "text-destructive"}`}>{n}</p>
                <p className="text-[10px] text-ink-muted">{d.pathwaysPer[a.slug] ?? 0} pathways</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Untagged essays (${d.untagged.length})`}>
          <List items={d.untagged.map((u) => u.title)} empty="Every live essay has at least one archetype." />
        </Panel>
        <Panel title={`Stale · older than ${d.staleMonths} months (${d.stale.length})`}>
          <List items={d.stale.map((s) => `${s.title} — ${fmtDate(s.updated_at)}`)} empty="Nothing is overdue for a refresh." />
        </Panel>
        <Panel title={`Declining engagement (${d.declining.length})`}>
          <List items={d.declining.map((s) => `${s.title} — ${s.last30} vs ${s.prev30} likes`)} empty="No essay lost significant traction." />
        </Panel>
        <Panel title={`Duplicate titles (${d.duplicates.length})`}>
          <List items={d.duplicates.map((x) => `${x.title}: ${x.slugs.join(", ")}`)} empty="Digest and Full Feed sets stay exclusive." />
        </Panel>
      </div>

      <Panel title={`Pathway issues (${d.pathwayIssues.length})`}>
        {d.pathwayIssues.length === 0 ? <p className="text-sm text-ink-muted">Every pathway day has content, a quiz and a prompt.</p> : (
          <ul className="space-y-3">
            {d.pathwayIssues.map((p) => (
              <li key={p.id} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <Badge>{p.archetype_slug}</Badge>
                  {!p.published && <Badge tone="warn">draft</Badge>}
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs text-ink-muted">{p.issues.slice(0, 8).map((i) => <li key={i}>{i}</li>)}</ul>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-ink-muted">{d.digestNote}</p>
    </div>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">{items.map((i) => <li key={i} className="border-b border-border/40 py-1">{i}</li>)}</ul>;
}
