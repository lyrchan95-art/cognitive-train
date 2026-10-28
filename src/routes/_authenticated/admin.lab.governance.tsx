import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listRuns, getAuditLog, MODEL_REGISTRY } from "@/lib/lab.functions";
import { Panel, Badge, Skeleton, Empty, ErrorBox, StatusBadge, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lab/governance")({
  component: Governance,
});

type Run = Awaited<ReturnType<typeof listRuns>>[number];
type Entry = Awaited<ReturnType<typeof getAuditLog>>[number];

function Governance() {
  const fetchRuns = useServerFn(listRuns);
  const fetchLog = useServerFn(getAuditLog);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [log, setLog] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    fetchRuns().then(setRuns).catch((e: Error) => setError(e.message));
    fetchLog({ data: { limit: 100 } }).then(setLog).catch(() => {});
  };
  useEffect(load, []);

  if (error) return <ErrorBox message={error} retry={load} />;

  return (
    <div className="space-y-6">
      <Panel eyebrow="Model governance" title="Production models">
        {!runs ? <Skeleton rows={3} /> : (
          <ul className="divide-y divide-border/50">
            {MODEL_REGISTRY.map((m) => {
              const prod = runs.find((r) => r.model_key === m.key && r.promotion_state === "production");
              const candidates = runs.filter((r) => r.model_key === m.key && r.promotion_state === "candidate").length;
              return (
                <li key={m.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-ink-muted">{candidates} candidate run{candidates === 1 ? "" : "s"}</p>
                  </div>
                  {prod ? (
                    <div className="flex items-center gap-2">
                      <Badge tone="good">production v{prod.version}</Badge>
                      <StatusBadge status={prod.status} />
                      <Link to="/admin/lab/runs/$id" params={{ id: prod.id }} className="text-sm font-medium text-accent">Open</Link>
                    </div>
                  ) : <Badge tone="warn">none promoted</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel eyebrow="Immutable trail" title="Audit log">
        {!log ? <Skeleton rows={5} /> : log.length === 0 ? (
          <Empty title="Nothing logged yet" body="Dataset saves, model runs and promotions are recorded here." />
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {log.map((e) => (
              <li key={e.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{e.action}</Badge>
                  <span className="text-xs text-ink-muted">{e.entity_type} · {fmtDate(e.created_at)}</span>
                </div>
                <p className="mt-1 break-words font-mono text-xs text-ink-soft">{JSON.stringify(e.payload)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
