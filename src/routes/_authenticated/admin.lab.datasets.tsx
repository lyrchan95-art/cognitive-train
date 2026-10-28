import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ARCHETYPES } from "@/data/archetypes";
import { DATASET_RECIPES, QUERY_SOURCES, listDatasets, previewDataset, saveDataset, deleteDataset, getDataset } from "@/lib/lab.functions";
import { Panel, Btn, Field, inputCls, Skeleton, Empty, ErrorBox, fmtDate, downloadText, toCsv } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/lab/datasets")({
  component: Datasets,
});

type Dataset = Awaited<ReturnType<typeof listDatasets>>[number];
type Table = { columns: string[]; rows: (string | number | null)[][]; suppressed: number; n: number; note?: string };

const SOURCES = Object.keys(QUERY_SOURCES) as (keyof typeof QUERY_SOURCES)[];

function Datasets() {
  const fetchList = useServerFn(listDatasets);
  const preview = useServerFn(previewDataset);
  const save = useServerFn(saveDataset);
  const remove = useServerFn(deleteDataset);
  const fetchOne = useServerFn(getDataset);

  const [rows, setRows] = useState<Dataset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [table, setTable] = useState<Table | null>(null);

  const [recipe, setRecipe] = useState<string>(DATASET_RECIPES[0].key);
  const [minCell, setMinCell] = useState(10);
  const [name, setName] = useState("");
  const [source, setSource] = useState<keyof typeof QUERY_SOURCES>("user_archetype");
  const [groupBy, setGroupBy] = useState<string[]>([QUERY_SOURCES.user_archetype.groupBy[0]]);
  const [metric, setMetric] = useState<string>(QUERY_SOURCES.user_archetype.metrics[0]);
  const [archFilter, setArchFilter] = useState<string[]>([]);

  const isCustom = recipe === "custom";
  const custom = isCustom
    ? { source, groupBy, metric, filters: archFilter.length ? { archetypes: archFilter } : {} }
    : undefined;

  const load = () => { setError(null); fetchList().then(setRows).catch((e: Error) => setError(e.message)); };
  useEffect(load, []);

  const onSource = (s: keyof typeof QUERY_SOURCES) => {
    setSource(s);
    setGroupBy([QUERY_SOURCES[s].groupBy[0]]);
    setMetric(QUERY_SOURCES[s].metrics[0]);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Panel eyebrow="Dataset builder" title="Build a cohort table">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Recipe">
              <select className={inputCls} value={recipe} onChange={(e) => setRecipe(e.target.value)}>
                {DATASET_RECIPES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
            </Field>
            <p className="text-sm text-ink-muted">{DATASET_RECIPES.find((r) => r.key === recipe)?.description}</p>
            <Field label="Minimum cell size" hint="Smaller cohorts are suppressed (floor 5).">
              <input type="number" min={5} className={inputCls} value={minCell} onChange={(e) => setMinCell(Number(e.target.value))} />
            </Field>
          </div>

          {isCustom && (
            <div className="space-y-3">
              <Field label="Source">
                <select className={inputCls} value={source} onChange={(e) => onSource(e.target.value as keyof typeof QUERY_SOURCES)}>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <div>
                <span className="eyebrow mb-1 block">Group by</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUERY_SOURCES[source].groupBy.map((g) => (
                    <button key={g} onClick={() => setGroupBy(groupBy.includes(g) ? groupBy.filter((x) => x !== g) : [...groupBy, g].slice(0, 2))}
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${groupBy.includes(g) ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted"}`}>{g}</button>
                  ))}
                </div>
              </div>
              <Field label="Metric">
                <select className={inputCls} value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {QUERY_SOURCES[source].metrics.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <div>
                <span className="eyebrow mb-1 block">Archetype filter</span>
                <div className="flex flex-wrap gap-1.5">
                  {ARCHETYPES.map((a) => (
                    <button key={a.slug} onClick={() => setArchFilter(archFilter.includes(a.slug) ? archFilter.filter((x) => x !== a.slug) : [...archFilter, a.slug])}
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${archFilter.includes(a.slug) ? "bg-ink text-paper" : "bg-paper-dark/50 text-ink-muted"}`}>{a.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Btn variant="outline" disabled={busy} onClick={() => run(async () => {
            const t = await preview({ data: { recipe: recipe as never, minCell, custom: custom as never } });
            setTable(t as Table);
          })}>{busy ? "Working…" : "Preview"}</Btn>
          <div className="min-w-[220px] flex-1">
            <Field label="Save as"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dataset name" /></Field>
          </div>
          <Btn disabled={busy || name.trim().length < 2} onClick={() => run(async () => {
            await save({ data: { name: name.trim(), recipe: recipe as never, minCell, custom: custom as never } });
            setName(""); load();
          })}>Save snapshot</Btn>
        </div>
        {error && <div className="mt-4"><ErrorBox message={error} /></div>}
      </Panel>

      {table && (
        <Panel eyebrow={`${table.n} rows · ${table.suppressed} suppressed cells`} title="Preview" action={
          <Btn variant="outline" onClick={() => downloadText("dataset-preview.csv", toCsv(table.columns, table.rows), "text/csv")}>CSV</Btn>
        }>
          {table.note && <p className="mb-3 text-xs text-ink-muted">{table.note}</p>}
          <DataTable table={table} />
        </Panel>
      )}

      <Panel eyebrow="Saved" title="Datasets" action={<Btn variant="outline" onClick={load}>Refresh</Btn>}>
        {!rows ? <Skeleton rows={4} /> : rows.length === 0 ? (
          <Empty title="No saved datasets" body="Preview a recipe above, then save it as a reproducible snapshot." />
        ) : (
          <ul className="divide-y divide-border/50">
            {rows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-ink-muted">{d.recipe} · {d.row_count} rows · {d.suppressed_cells} suppressed · {fmtDate(d.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" onClick={() => run(async () => {
                    const full = await fetchOne({ data: { id: d.id } });
                    setTable(full.snapshot as unknown as Table);
                  })}>View</Btn>
                  <Btn variant="danger" onClick={() => run(async () => { await remove({ data: { id: d.id } }); load(); })}>Delete</Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function DataTable({ table }: { table: Table }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left">
            {table.columns.map((c) => <th key={c} className="py-2 pr-3 eyebrow">{c.replace(/_/g, " ")}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.slice(0, 200).map((r, i) => (
            <tr key={i} className="border-b border-border/40">
              {r.map((v, j) => (
                <td key={j} className="py-2 pr-3 font-mono text-xs tabular-nums">
                  {v === null ? <span className="text-ink-muted">n&lt;k</span> : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
