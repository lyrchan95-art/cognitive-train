import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getRun, promoteRun, addInsight, createShareLink, MODEL_REGISTRY } from "@/lib/lab.functions";
import { LabResults } from "@/components/admin/LabResults";
import { Panel, Btn, Badge, Field, inputCls, Skeleton, ErrorBox, StatusBadge, fmtDate, downloadText } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lab/runs/$id")({
  component: RunDetail,
});

type Payload = Awaited<ReturnType<typeof getRun>>;

function RunDetail() {
  const { id } = Route.useParams();
  const fetchRun = useServerFn(getRun);
  const promote = useServerFn(promoteRun);
  const share = useServerFn(createShareLink);
  const insight = useServerFn(addInsight);

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState({ hypothesis: "", finding: "", followUp: "", tags: "" });

  const load = () => {
    setError(null);
    fetchRun({ data: { id } }).then(setData).catch((e: Error) => setError(e.message));
  };
  useEffect(load, [id]);

  // Poll while the job is still in flight.
  useEffect(() => {
    const s = data?.run.status;
    if (s !== "queued" && s !== "running") return;
    const t = setTimeout(load, 2000);
    return () => clearTimeout(t);
  }, [data]);

  if (error) return <ErrorBox message={error} retry={load} />;
  if (!data) return <Skeleton rows={6} />;

  const run = data.run;
  const model = MODEL_REGISTRY.find((m) => m.key === run.model_key);

  const doPromote = async (state: "experiment" | "candidate" | "production") => {
    setBusy(true);
    try { await promote({ data: { id, state, evidence } }); load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Panel
        eyebrow={`Run v${run.version}`}
        title={model?.name ?? run.model_key}
        action={<Link to="/admin/lab" className="text-sm font-medium text-accent">← All runs</Link>}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={run.status} />
          <Badge tone={run.promotion_state === "production" ? "good" : run.promotion_state === "candidate" ? "warn" : "neutral"}>{run.promotion_state}</Badge>
          <span className="text-xs text-ink-muted">Started {fmtDate(run.started_at)} · Finished {fmtDate(run.finished_at)}</span>
        </div>
        {(run.status === "queued" || run.status === "running") && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-paper-dark/60">
              <div className="h-full bg-accent transition-all" style={{ width: `${run.progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">{run.progress_label ?? "Working…"}</p>
          </div>
        )}
        <div className="mt-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
          <p className="font-mono break-words">config: {JSON.stringify(run.config)}</p>
          <p className="font-mono break-words">snapshot: {JSON.stringify(run.dataset_snapshot)}</p>
        </div>
      </Panel>

      <Panel eyebrow="Results" title="Results explorer" action={
        <Btn variant="outline" onClick={() => downloadText(`run-${run.model_key}-v${run.version}.json`, JSON.stringify(run, null, 2), "application/json")}>Export JSON</Btn>
      }>
        <LabResults run={{ model_key: run.model_key, status: run.status, metrics: (run.metrics ?? {}) as never, results: (run.results ?? {}) as never, error: run.error, config: run.config }} />
      </Panel>

      <Panel eyebrow="Governance" title="Promotion">
        <Field label="Evidence / rationale">
          <textarea className={inputCls} rows={3} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Why this state change is justified" />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn variant="outline" disabled={busy} onClick={() => doPromote("experiment")}>Mark experiment</Btn>
          <Btn variant="outline" disabled={busy} onClick={() => doPromote("candidate")}>Promote to candidate</Btn>
          <Btn disabled={busy || run.status !== "done"} onClick={() => doPromote("production")}>Promote to production</Btn>
        </div>
        <p className="mt-2 text-xs text-ink-muted">Only completed runs reach production, and exactly one production run exists per model. Every change is written to the audit log.</p>
      </Panel>

      <Panel eyebrow="Sharing" title="Read-only link" action={
        <Btn variant="outline" disabled={busy} onClick={async () => {
          setBusy(true);
          try { const r = await share({ data: { runId: id, days: 30 } }); setToken(r.token); load(); }
          catch (e) { setError((e as Error).message); }
          finally { setBusy(false); }
        }}>Create link</Btn>
      }>
        {token && (
          <p className="mb-3 break-all font-mono text-xs">{`${typeof window !== "undefined" ? window.location.origin : ""}/lab/shared/${token}`}</p>
        )}
        {data.shareLinks.length === 0 ? (
          <p className="text-sm text-ink-muted">No share links yet. Links expire after 30 days and expose aggregates only.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {data.shareLinks.map((l) => (
              <li key={l.token} className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono">/lab/shared/{l.token}</span>
                <span className="text-ink-muted">expires {fmtDate(l.expires_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel eyebrow="Insight log" title="What did we learn?">
        <div className="grid gap-3">
          <Field label="Hypothesis"><textarea rows={2} className={inputCls} value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} /></Field>
          <Field label="Finding"><textarea rows={3} className={inputCls} value={form.finding} onChange={(e) => setForm({ ...form, finding: e.target.value })} /></Field>
          <Field label="Follow-up"><textarea rows={2} className={inputCls} value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} /></Field>
          <Field label="Tags" hint="Comma separated"><input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <div>
            <Btn disabled={busy || !form.finding.trim()} onClick={async () => {
              setBusy(true);
              try {
                await insight({ data: {
                  runId: id, hypothesis: form.hypothesis, finding: form.finding, followUp: form.followUp,
                  tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10), linkedArticleIds: [],
                } });
                setForm({ hypothesis: "", finding: "", followUp: "", tags: "" });
                load();
              } catch (e) { setError((e as Error).message); }
              finally { setBusy(false); }
            }}>Save insight</Btn>
          </div>
        </div>
        {data.insights.length > 0 && (
          <ul className="mt-6 space-y-4">
            {data.insights.map((i) => (
              <li key={i.id} className="rounded-lg border border-border/60 p-4">
                <p className="text-xs text-ink-muted">{fmtDate(i.created_at)}</p>
                {i.hypothesis && <p className="mt-1 text-sm"><span className="eyebrow mr-2">Hypothesis</span>{i.hypothesis}</p>}
                <p className="mt-1 text-sm"><span className="eyebrow mr-2">Finding</span>{i.finding}</p>
                {i.follow_up && <p className="mt-1 text-sm"><span className="eyebrow mr-2">Follow-up</span>{i.follow_up}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">{i.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
