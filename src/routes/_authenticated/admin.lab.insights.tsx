import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { listInsights } from "@/lib/lab.functions";
import { Panel, Badge, Skeleton, Empty, ErrorBox, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lab/insights")({
  component: Insights,
});

type Insight = Awaited<ReturnType<typeof listInsights>>[number];

function Insights() {
  const fetchAll = useServerFn(listInsights);
  const [rows, setRows] = useState<Insight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState<string>("");

  const load = () => { setError(null); fetchAll().then(setRows).catch((e: Error) => setError(e.message)); };
  useEffect(load, []);

  const tags = useMemo(() => [...new Set((rows ?? []).flatMap((r) => r.tags))], [rows]);
  const visible = (rows ?? []).filter((r) => !tag || r.tags.includes(tag));

  if (error) return <ErrorBox message={error} retry={load} />;
  if (!rows) return <Skeleton rows={5} />;

  return (
    <Panel eyebrow="Knowledge base" title="Insight log">
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button onClick={() => setTag("")} className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${!tag ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted"}`}>All</button>
          {tags.map((t) => (
            <button key={t} onClick={() => setTag(t)} className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${tag === t ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted"}`}>{t}</button>
          ))}
        </div>
      )}
      {visible.length === 0 ? (
        <Empty title="No insights recorded" body="Findings you save on a run appear here, searchable by tag." />
      ) : (
        <ul className="space-y-4">
          {visible.map((i) => (
            <li key={i.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-muted">{fmtDate(i.created_at)}</p>
                <Link to="/admin/lab/runs/$id" params={{ id: i.run_id }} className="text-sm font-medium text-accent">Open run</Link>
              </div>
              {i.hypothesis && <p className="mt-2 text-sm"><span className="eyebrow mr-2">Hypothesis</span>{i.hypothesis}</p>}
              <p className="mt-1 text-sm"><span className="eyebrow mr-2">Finding</span>{i.finding}</p>
              {i.follow_up && <p className="mt-1 text-sm"><span className="eyebrow mr-2">Follow-up</span>{i.follow_up}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">{i.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
