import { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ScatterChart, Scatter, CartesianGrid, Legend, Cell,
} from "recharts";
import { ARCHETYPES } from "@/data/archetypes";
import { archetypeColor, BAND_COLORS, CLUSTER_COLORS } from "@/lib/archetype-colors";
import { Metric, Panel, Empty, Btn, downloadSvgAsPng, downloadText, toCsv, Badge } from "@/components/admin/ui";

const SLUGS = ARCHETYPES.map((a) => a.slug);
const nameOf = (slug: string) => ARCHETYPES.find((a) => a.slug === slug)?.name ?? slug;

export type RunLike = {
  model_key: string;
  status: string;
  metrics: Record<string, number | string | null>;
  results: Record<string, unknown>;
  error?: string | null;
  config?: unknown;
};

export function LabResults({ run }: { run: RunLike }) {
  const [archFilter, setArchFilter] = useState<string[]>([]);
  const [bandFilter, setBandFilter] = useState<string[]>([]);
  const keepArch = (s: string) => !archFilter.length || archFilter.includes(s);
  const keepBand = (b: string) => !bandFilter.length || bandFilter.includes(b);

  if (run.status === "empty") {
    return <Empty title="No usable data for this model" body={run.error ?? "Not enough rows cleared the privacy threshold."} />;
  }
  if (run.status === "failed") {
    return <Empty title="Run failed" body={run.error ?? "Unknown error"} />;
  }
  if (run.status !== "done") {
    return <Empty title="Still running" body="Results appear here as soon as the job finishes." />;
  }

  const metrics = Object.entries(run.metrics ?? {});
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(([k, v]) => <Metric key={k} label={k.replace(/_/g, " ")} value={v == null ? "—" : typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(3)) : String(v)} />)}
      </div>

      <FilterBar arch={archFilter} setArch={setArchFilter} band={bandFilter} setBand={setBandFilter} showBands={run.model_key === "churn_survival"} />

      {run.model_key === "clustering" && <ClusteringView r={run.results as ClusterResults} keepArch={keepArch} />}
      {run.model_key === "distance_validation" && <ValidationView r={run.results as ValidationResults} keepArch={keepArch} />}
      {run.model_key === "churn_survival" && <ChurnView r={run.results as ChurnResults} keepArch={keepArch} keepBand={keepBand} />}
      {run.model_key === "uplift" && <UpliftView r={run.results as UpliftResults} keepArch={keepArch} />}
      {run.model_key === "content_recommender" && <RecommenderView r={run.results as RecResults} keepArch={keepArch} />}
    </div>
  );
}

function FilterBar({ arch, setArch, band, setBand, showBands }: { arch: string[]; setArch: (v: string[]) => void; band: string[]; setBand: (v: string[]) => void; showBands: boolean }) {
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="eyebrow mr-2">Filter</span>
      {SLUGS.map((s) => (
        <button key={s} onClick={() => toggle(arch, setArch, s)} className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${arch.includes(s) ? "text-paper" : "border-border text-ink-muted"}`}
          style={arch.includes(s) ? { background: archetypeColor(s), borderColor: archetypeColor(s) } : undefined}>{s}</button>
      ))}
      {showBands && ["healthy", "strained", "toxic", "critical"].map((b) => (
        <button key={b} onClick={() => toggle(band, setBand, b)} className={`ml-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${band.includes(b) ? "text-paper" : "border-border text-ink-muted"}`}
          style={band.includes(b) ? { background: BAND_COLORS[b], borderColor: BAND_COLORS[b] } : undefined}>{b}</button>
      ))}
      {(arch.length || band.length) ? <button onClick={() => { setArch([]); setBand([]); }} className="ml-2 text-xs text-accent">Clear</button> : null}
    </div>
  );
}

function ChartPanel({ title, csv, children, note }: { title: string; csv?: { columns: string[]; rows: (string | number | null)[][] }; children: React.ReactNode; note?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Panel title={title} action={
      <div className="flex gap-1">
        {csv && <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => downloadText(`${slug}.csv`, toCsv(csv.columns, csv.rows), "text/csv")}>CSV</Btn>}
        <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => downloadSvgAsPng(ref.current, `${slug}.png`)}>PNG</Btn>
      </div>
    }>
      <div ref={ref}>{children}</div>
      {note && <p className="mt-3 text-xs text-ink-muted">{note}</p>}
    </Panel>
  );
}

const Suppressed = () => <span className="font-mono text-[10px] text-ink-muted" title="Suppressed: below minimum cell size">n&lt;k</span>;

/* ---------- Clustering ---------- */
type ClusterResults = { clusters: { cluster: number; n: number; centroid: Record<string, number>; dominant: string | null; purity: number | null; suppressed: boolean }[]; elbow: { k: number; inertia: number }[]; projection: { x: number; y: number; c: number; a: string }[] };
function ClusteringView({ r, keepArch }: { r: ClusterResults; keepArch: (s: string) => boolean }) {
  const pts = (r.projection ?? []).filter((p) => keepArch(p.a));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartPanel title="Cluster projection (PCA 2-D)" note="Colour = k-means cluster. If archetypes hold, clusters should be archetype-pure. Points are anonymous coordinates only.">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <YAxis dataKey="y" type="number" tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => v.toFixed(2)} labelFormatter={() => ""} />
            <Scatter data={pts}>
              {pts.map((p, i) => <Cell key={i} fill={CLUSTER_COLORS[p.c % CLUSTER_COLORS.length]} fillOpacity={0.75} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title="Elbow curve" csv={{ columns: ["k", "inertia"], rows: r.elbow.map((e) => [e.k, e.inertia]) }} note="A clear knee near k=12 supports the 12-archetype model; a smooth curve suggests fewer natural groups.">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={r.elbow}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="k" tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="inertia" stroke="var(--accent)" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
      <Panel title="Cluster summary" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-ink-muted"><tr><th className="py-2 pr-3">Cluster</th><th className="py-2 pr-3">n</th><th className="py-2 pr-3">Dominant archetype</th><th className="py-2 pr-3">Purity</th>{["C", "O", "N", "S", "A", "D"].map((d) => <th key={d} className="py-2 pr-3 font-mono">{d}</th>)}</tr></thead>
            <tbody>{r.clusters.map((c) => (
              <tr key={c.cluster} className="border-t border-border/60">
                <td className="py-2 pr-3"><span className="inline-block h-3 w-3 rounded-full align-middle" style={{ background: CLUSTER_COLORS[c.cluster % 12] }} /> <span className="font-mono">{c.cluster}</span></td>
                <td className="py-2 pr-3 font-mono">{c.n}</td>
                <td className="py-2 pr-3">{c.suppressed ? <Suppressed /> : c.dominant ? <span style={{ color: archetypeColor(c.dominant) }} className="font-medium">{nameOf(c.dominant)}</span> : "—"}</td>
                <td className="py-2 pr-3 font-mono">{c.purity ?? <Suppressed />}</td>
                {["C", "O", "N", "S", "A", "D"].map((d) => <td key={d} className="py-2 pr-3 font-mono text-xs">{c.centroid[d]}</td>)}
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------- Validation ---------- */
type ValidationResults = { confusion: { labels: string[]; matrix: number[][]; accuracy: number }; calibration: { bin: string; n: number; stability: number | null }[]; perArchetype: { slug: string; n: number; recall: number | null }[] };
function ValidationView({ r, keepArch }: { r: ValidationResults; keepArch: (s: string) => boolean }) {
  const labels = r.confusion.labels;
  const max = Math.max(1, ...r.confusion.matrix.flat());
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Confusion matrix (assigned → held-out prediction)" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="text-[10px] font-mono">
            <thead><tr><th className="p-1" /><th colSpan={labels.length} className="p-1 text-left text-ink-muted">predicted →</th></tr><tr><th className="p-1" />{labels.map((l) => <th key={l} className="p-1 text-left" style={{ color: archetypeColor(l) }}>{l.slice(0, 4)}</th>)}</tr></thead>
            <tbody>{labels.map((row, i) => keepArch(row) && (
              <tr key={row}><th className="p-1 text-left" style={{ color: archetypeColor(row) }}>{row.slice(0, 5)}</th>
                {labels.map((col, j) => { const v = r.confusion.matrix[i][j]; return <td key={col} className="h-7 w-7 text-center" style={{ background: `color-mix(in oklch, ${archetypeColor(row)} ${Math.round((v / max) * 85)}%, transparent)`, color: v / max > 0.5 ? "var(--paper)" : "var(--ink)" }}>{v || ""}</td>; })}
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>
      <ChartPanel title="Confidence calibration" csv={{ columns: ["bin", "n", "stability"], rows: r.calibration.map((c) => [c.bin, c.n, c.stability]) }} note="If confidence is calibrated, higher-confidence bins should show higher held-out stability.">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={r.calibration}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="bin" tick={{ fontSize: 10 }} stroke="var(--ink-muted)" /><YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="stability" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
      <ChartPanel title="Recall per archetype" csv={{ columns: ["archetype", "n", "recall"], rows: r.perArchetype.map((p) => [p.slug, p.n, p.recall]) }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={r.perArchetype.filter((p) => keepArch(p.slug))}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="slug" tick={{ fontSize: 9 }} stroke="var(--ink-muted)" /><YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="recall" radius={[4, 4, 0, 0]}>{r.perArchetype.filter((p) => keepArch(p.slug)).map((p) => <Cell key={p.slug} fill={archetypeColor(p.slug)} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}

/* ---------- Churn ---------- */
type Curve = { t: number; s: number; atRisk: number }[];
type ChurnResults = { overall: Curve; byArchetype: { slug: string; n: number; curve: Curve | null; median: number | null }[]; byBand: { band: string; n: number; curve: Curve | null }[]; heatmap: { rows: string[]; cols: string[]; cells: { n: number; churn: number | null }[][] } };
function ChurnView({ r, keepArch, keepBand }: { r: ChurnResults; keepArch: (s: string) => boolean; keepBand: (b: string) => boolean }) {
  const series = useMemo(() => {
    const times = [...new Set([...r.overall, ...r.byArchetype.flatMap((a) => a.curve ?? []), ...r.byBand.flatMap((b) => b.curve ?? [])].map((p) => p.t))].sort((a, b) => a - b);
    const step = (curve: Curve, t: number) => [...curve].reverse().find((p) => p.t <= t)?.s ?? 1;
    return times.map((t) => ({ t, overall: step(r.overall, t), ...Object.fromEntries(r.byArchetype.filter((a) => a.curve && keepArch(a.slug)).map((a) => [a.slug, step(a.curve!, t)])), ...Object.fromEntries(r.byBand.filter((b) => b.curve && keepBand(b.band)).map((b) => [`band:${b.band}`, step(b.curve!, t)])) }));
  }, [r, keepArch, keepBand]);
  const archKeys = r.byArchetype.filter((a) => a.curve && keepArch(a.slug)).map((a) => a.slug);
  const bandKeys = r.byBand.filter((b) => b.curve && keepBand(b.band)).map((b) => b.band);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartPanel title="Retention curves (Kaplan–Meier)" csv={{ columns: ["t", ...Object.keys(series[0] ?? {}).filter((k) => k !== "t")], rows: series.map((s) => Object.values(s) as number[]) }} note="Survival = share of users still active after t days. Cohorts below the minimum cell size are hidden.">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={series}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--ink-muted)" label={{ value: "days", position: "insideBottomRight", fontSize: 10 }} /><YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <Tooltip contentStyle={{ fontSize: 11 }} /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="stepAfter" dataKey="overall" stroke="var(--ink)" strokeWidth={2} dot={false} />
            {archKeys.map((k) => <Line key={k} type="stepAfter" dataKey={k} stroke={archetypeColor(k)} strokeWidth={1.5} dot={false} />)}
            {bandKeys.map((k) => <Line key={k} type="stepAfter" dataKey={`band:${k}`} stroke={BAND_COLORS[k]} strokeDasharray="4 2" dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
      <Panel title="Churn heatmap: archetype × environment">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr><th className="p-1 text-left" />{r.heatmap.cols.map((c) => <th key={c} className="p-1 font-mono uppercase" style={{ color: BAND_COLORS[c] }}>{c}</th>)}</tr></thead>
            <tbody>{r.heatmap.rows.map((row, i) => keepArch(row) && (
              <tr key={row}><th className="p-1 text-left font-medium" style={{ color: archetypeColor(row) }}>{nameOf(row)}</th>
                {r.heatmap.cells[i].map((c, j) => keepBand(r.heatmap.cols[j]) ? (
                  <td key={j} className="h-9 text-center font-mono" style={{ background: c.churn == null ? "transparent" : `color-mix(in oklch, var(--destructive) ${Math.round(c.churn * 80)}%, transparent)` }}>{c.churn == null ? (c.n ? <Suppressed /> : "") : `${Math.round(c.churn * 100)}%`}</td>
                ) : <td key={j} />)}
              </tr>))}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-muted">Median time-to-churn: {r.byArchetype.filter((a) => a.median != null && keepArch(a.slug)).map((a) => `${nameOf(a.slug)} ${a.median}d`).join(" · ") || "insufficient data"}</p>
      </Panel>
    </div>
  );
}

/* ---------- Uplift ---------- */
type UpliftResults = { strata: { slug: string; n_treated: number; n_control: number; uplift: number | null }[]; caveat: string };
function UpliftView({ r, keepArch }: { r: UpliftResults; keepArch: (s: string) => boolean }) {
  const data = r.strata.filter((s) => keepArch(s.slug));
  return (
    <div className="space-y-6">
      <ChartPanel title="Next-day retention uplift by archetype" csv={{ columns: ["archetype", "treated", "control", "uplift"], rows: data.map((s) => [s.slug, s.n_treated, s.n_control, s.uplift]) }} note={r.caveat}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="slug" tick={{ fontSize: 9 }} stroke="var(--ink-muted)" /><YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} stroke="var(--ink-muted)" />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="uplift" radius={[4, 4, 0, 0]}>{data.map((s) => <Cell key={s.slug} fill={archetypeColor(s.slug)} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
      <div className="flex flex-wrap gap-2">{data.filter((s) => s.uplift == null).map((s) => <Badge key={s.slug}>{s.slug}: n&lt;k ({s.n_treated}/{s.n_control})</Badge>)}</div>
    </div>
  );
}

/* ---------- Recommender ---------- */
type RecResults = { affinity: Record<string, Record<string, number>>; tags: string[]; suggestions: { article_id: string; slug: string; title: string; archetype: string; score: number }[] };
function RecommenderView({ r, keepArch }: { r: RecResults; keepArch: (s: string) => boolean }) {
  const rows = SLUGS.filter(keepArch);
  const max = Math.max(1, ...rows.flatMap((s) => r.tags.map((t) => r.affinity[s]?.[t] ?? 0)));
  return (
    <div className="space-y-6">
      <Panel title="Affinity lift: archetype × tag" action={<Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => downloadText("affinity.csv", toCsv(["archetype", ...r.tags], rows.map((s) => [s, ...r.tags.map((t) => r.affinity[s]?.[t] ?? 0)])), "text/csv")}>CSV</Btn>}>
        <div className="overflow-x-auto">
          <table className="text-[10px] font-mono">
            <thead><tr><th className="p-1" />{r.tags.map((t) => <th key={t} className="p-1 text-left align-bottom" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{t}</th>)}</tr></thead>
            <tbody>{rows.map((s) => (
              <tr key={s}><th className="p-1 text-left" style={{ color: archetypeColor(s) }}>{s}</th>
                {r.tags.map((t) => { const v = r.affinity[s]?.[t] ?? 0; return <td key={t} className="h-6 w-6 text-center" style={{ background: `color-mix(in oklch, ${archetypeColor(s)} ${Math.round((v / max) * 85)}%, transparent)`, color: v / max > 0.5 ? "var(--paper)" : "var(--ink)" }}>{v ? v.toFixed(1) : ""}</td>; })}
              </tr>))}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-muted">Lift &gt; 1 = this archetype likes the tag more than the population. Suggestions below are untagged article × archetype pairs whose mean tag lift clears the threshold.</p>
      </Panel>
      <Panel title={`Suggested tags (${r.suggestions.filter((s) => keepArch(s.archetype)).length})`}>
        {r.suggestions.length ? (
          <ul className="divide-y divide-border/60 text-sm">{r.suggestions.filter((s) => keepArch(s.archetype)).slice(0, 40).map((s) => (
            <li key={`${s.article_id}|${s.archetype}`} className="flex items-center justify-between gap-3 py-2"><span className="truncate">{s.title}</span><span className="flex items-center gap-2 font-mono text-xs"><span style={{ color: archetypeColor(s.archetype) }}>{s.archetype}</span><span>{s.score.toFixed(2)}</span></span></li>
          ))}</ul>
        ) : <p className="text-sm text-ink-muted">No suggestions cleared the lift threshold.</p>}
        <p className="mt-3 text-xs text-ink-muted">Promote this run to production and the suggestions appear as one-click accepts in the Content Console tagging matrix.</p>
      </Panel>
    </div>
  );
}
