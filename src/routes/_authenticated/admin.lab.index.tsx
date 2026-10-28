import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ARCHETYPES } from "@/data/archetypes";
import { TOXICITY_BANDS } from "@/lib/lab-models";
import { MODEL_REGISTRY, listRuns, listDatasets, startRun } from "@/lib/lab.functions";
import { Panel, Btn, Field, inputCls, Skeleton, Empty, ErrorBox, StatusBadge, Badge, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lab/")({
  component: LabRuns,
});

type Run = Awaited<ReturnType<typeof listRuns>>[number];
type Dataset = Awaited<ReturnType<typeof listDatasets>>[number];

function LabRuns() {
  const navigate = useNavigate();
  const fetchRuns = useServerFn(listRuns);
  const fetchDatasets = useServerFn(listDatasets);
  const run = useServerFn(startRun);

  const [runs, setRuns] = useState<Run[] | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [modelKey, setModelKey] = useState<string>(MODEL_REGISTRY[0].key);
  const [datasetId, setDatasetId] = useState<string>("");
  const [minCell, setMinCell] = useState(10);
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [bands, setBands] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const model = MODEL_REGISTRY.find((m) => m.key === modelKey)!;
  const [params, setParams] = useState<Record<string, number>>({ ...(model.params as Record<string, number>) });

  const load = () => {
    setError(null);
    fetchRuns().then(setRuns).catch((e: Error) => setError(e.message));
    fetchDatasets().then(setDatasets).catch(() => {});
  };
  useEffect(load, []);

  const onModel = (key: string) => {
    setModelKey(key);
    const m = MODEL_REGISTRY.find((x) => x.key === key)!;
    setParams({ ...(m.params as Record<string, number>) });
  };

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const launch = async () => {
    setBusy(true); setError(null);
    try {
      const res = await run({
        data: {
          modelKey: modelKey as never,
          datasetId: datasetId || undefined,
          params,
          minCell,
          filters: {
            ...(archetypes.length ? { archetypes } : {}),
            ...(bands.length ? { bands } : {}),
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
          },
        },
      });
      navigate({ to: "/admin/lab/runs/$id", params: { id: res.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel eyebrow="Model registry" title="New run">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <Field label="Model">
              <select className={inputCls} value={modelKey} onChange={(e) => onModel(e.target.value)}>
                {MODEL_REGISTRY.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </Field>
            <p className="text-sm text-ink-muted">{model.description}</p>

            <Field label="Dataset snapshot (optional)">
              <select className={inputCls} value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
                <option value="">Live substrate</option>
                {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>

            {Object.keys(params).length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(params).map(([k, v]) => (
                  <Field key={k} label={k}>
                    <input
                      type="number"
                      className={inputCls}
                      value={v}
                      onChange={(e) => setParams({ ...params, [k]: Number(e.target.value) })}
                    />
                  </Field>
                ))}
              </div>
            )}

            <Field label="Minimum cell size" hint="Cohorts smaller than this are suppressed (floor 5).">
              <input type="number" min={5} className={inputCls} value={minCell} onChange={(e) => setMinCell(Number(e.target.value))} />
            </Field>
          </div>

          <div className="space-y-3">
            <div>
              <span className="eyebrow mb-1 block">Archetype filter</span>
              <div className="flex flex-wrap gap-1.5">
                {ARCHETYPES.map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => toggle(archetypes, setArchetypes, a.slug)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${archetypes.includes(a.slug) ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted hover:text-ink"}`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow mb-1 block">Environment band</span>
              <div className="flex flex-wrap gap-1.5">
                {TOXICITY_BANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => toggle(bands, setBands, b)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${bands.includes(b) ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted hover:text-ink"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
            <Btn onClick={launch} disabled={busy}>{busy ? "Running…" : "Run model"}</Btn>
          </div>
        </div>
        {error && <div className="mt-4"><ErrorBox message={error} retry={load} /></div>}
      </Panel>

      <Panel eyebrow="History" title="Runs" action={<Btn variant="outline" onClick={load}>Refresh</Btn>}>
        {!runs ? <Skeleton rows={5} /> : runs.length === 0 ? (
          <Empty title="No runs yet" body="Pick a model above and launch your first run." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="py-2 pr-3 eyebrow">Model</th>
                  <th className="py-2 pr-3 eyebrow">v</th>
                  <th className="py-2 pr-3 eyebrow">Status</th>
                  <th className="py-2 pr-3 eyebrow">Promotion</th>
                  <th className="py-2 pr-3 eyebrow">Finished</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2 pr-3">{MODEL_REGISTRY.find((m) => m.key === r.model_key)?.name ?? r.model_key}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.version}</td>
                    <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                    <td className="py-2 pr-3"><Badge tone={r.promotion_state === "production" ? "good" : r.promotion_state === "candidate" ? "warn" : "neutral"}>{r.promotion_state}</Badge></td>
                    <td className="py-2 pr-3 text-xs text-ink-muted">{fmtDate(r.finished_at)}</td>
                    <td className="py-2 text-right">
                      <Link to="/admin/lab/runs/$id" params={{ id: r.id }} className="text-sm font-medium text-accent">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
