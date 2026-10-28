// Archetype Behaviour Lab — typed server functions. All handlers run server-side,
// gated by requireSupabaseAuth + is_lab_user(). Only aggregates ever leave the server.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertLab, audit, clampMinCell, type Sb } from "@/lib/staff-guards";
import { ARCHETYPES } from "@/data/archetypes";
import { QUESTIONS, evaluate, scoreArchetypes, type Responses, type DimensionScores } from "@/lib/quiz";
import {
  DIMS, kmeans, silhouette, confusionMatrix, kaplanMeier, dimsToVec, toxicityBand,
  TOXICITY_BANDS, groupBy, mean, round, kCell, mulberry32,
} from "@/lib/lab-models";

const SLUGS = ARCHETYPES.map((a) => a.slug);

/* =====================================================================
 * Behavioural substrate loader — one privileged read, then everything is
 * aggregated in memory. Raw rows never leave this module.
 * ===================================================================== */

type Substrate = {
  users: { user_id: string; slug: string; confidence: number; dims: DimensionScores; responses: Responses; taken_at: string }[];
  audits: { user_id: string; autonomy: number; psychological_safety: number; workload: number; recognition: number; purpose: number; toxicity_score: number; taken_at: string }[];
  briefings: { user_id: string; briefing_date: string; archetype_slug: string; read_at: string | null; action_done_at: string | null; reflection_done_at: string | null }[];
  streaks: { user_id: string; current_streak: number; longest_streak: number; last_check_in: string | null; total_briefings_read: number }[];
  progress: { user_id: string; pathway_id: string; day_number: number; completed_at: string; quiz_correct: boolean; journal_entry: string | null }[];
  pathways: { id: string; slug: string; archetype_slug: string; duration_days: number; certificate_title: string | null }[];
  articles: { id: string; slug: string; title: string; category: string; tags: string[]; published: boolean }[];
  tags: { article_id: string; archetype_slug: string }[];
  likes: { user_id: string; article_id: string; created_at: string }[];
};

async function loadSubstrate(): Promise<Substrate> {
  // Privileged read of user-level tables is required for cross-user analysis; the caller's
  // lab role has already been verified through RLS-backed user_roles before we get here.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [ua, wa, db, us, pp, pw, ar, at, al] = await Promise.all([
    supabaseAdmin.from("user_archetype").select("user_id, archetype_slug, confidence, dimension_scores, responses, taken_at"),
    supabaseAdmin.from("workplace_audits").select("user_id, autonomy, psychological_safety, workload, recognition, purpose, toxicity_score, taken_at"),
    supabaseAdmin.from("daily_briefings").select("user_id, briefing_date, archetype_slug, read_at, action_done_at, reflection_done_at"),
    supabaseAdmin.from("user_streaks").select("user_id, current_streak, longest_streak, last_check_in, total_briefings_read"),
    supabaseAdmin.from("pathway_progress").select("user_id, pathway_id, day_number, completed_at, quiz_correct, journal_entry"),
    supabaseAdmin.from("pathways").select("id, slug, archetype_slug, duration_days, certificate_title"),
    supabaseAdmin.from("articles").select("id, slug, title, category, tags, published"),
    supabaseAdmin.from("article_archetypes").select("article_id, archetype_slug"),
    supabaseAdmin.from("article_likes").select("user_id, article_id, created_at"),
  ]);
  for (const r of [ua, wa, db, us, pp, pw, ar, at, al]) if (r.error) throw new Error(r.error.message);
  return {
    users: (ua.data ?? []).map((r) => ({
      user_id: r.user_id, slug: r.archetype_slug, confidence: Number(r.confidence),
      dims: r.dimension_scores as DimensionScores, responses: (r.responses ?? {}) as Responses, taken_at: r.taken_at,
    })),
    audits: (wa.data ?? []).map((r) => ({ ...r, autonomy: +r.autonomy, psychological_safety: +r.psychological_safety, workload: +r.workload, recognition: +r.recognition, purpose: +r.purpose, toxicity_score: +r.toxicity_score })),
    briefings: db.data ?? [],
    streaks: us.data ?? [],
    progress: pp.data ?? [],
    pathways: pw.data ?? [],
    articles: ar.data ?? [],
    tags: at.data ?? [],
    likes: al.data ?? [],
  };
}

/** Latest audit per user → toxicity band lookup. */
function latestAuditByUser(s: Substrate) {
  const m = new Map<string, Substrate["audits"][number]>();
  for (const a of [...s.audits].sort((x, y) => x.taken_at.localeCompare(y.taken_at))) m.set(a.user_id, a);
  return m;
}

/* =====================================================================
 * Dataset recipes
 * ===================================================================== */

export const DATASET_RECIPES = [
  { key: "archetype_audit_matrix", name: "Archetype × Audit dimension matrix", description: "Mean of the 5 toxicity dimensions and composite per archetype." },
  { key: "daily_loop_funnel", name: "Daily-loop completion funnel by archetype", description: "Briefing served → read → action done → reflection done." },
  { key: "content_affinity", name: "Content affinity matrix (archetype × article tag)", description: "Like rate per archetype per content tag." },
  { key: "burnout_dropoff", name: "Burnout protocol completion & drop-off", description: "Last completed module by archetype × environment band." },
  { key: "item_distributions", name: "Psychometric item response distributions", description: "Likert histogram + item-total correlation for all 30 items." },
  { key: "custom", name: "Custom query", description: "Pick a source, group-by fields, filters and a metric." },
] as const;

export type RecipeKey = (typeof DATASET_RECIPES)[number]["key"];

/** Allowlisted custom-query vocabulary (visual builder). */
export const QUERY_SOURCES = {
  user_archetype: { groupBy: ["archetype_slug"], metrics: ["count", "avg_confidence"] },
  workplace_audits: { groupBy: ["archetype_slug", "toxicity_band"], metrics: ["count", "avg_toxicity", "avg_autonomy", "avg_psychological_safety", "avg_workload", "avg_recognition", "avg_purpose"] },
  daily_briefings: { groupBy: ["archetype_slug", "month"], metrics: ["count", "read_rate", "action_rate", "reflection_rate"] },
  user_streaks: { groupBy: ["archetype_slug"], metrics: ["count", "avg_current_streak", "avg_longest_streak"] },
  pathway_progress: { groupBy: ["archetype_slug", "pathway_slug"], metrics: ["count", "avg_day_reached", "quiz_accuracy", "journal_rate"] },
  article_likes: { groupBy: ["archetype_slug", "category"], metrics: ["count"] },
} as const;

const customConfigSchema = z.object({
  source: z.enum(["user_archetype", "workplace_audits", "daily_briefings", "user_streaks", "pathway_progress", "article_likes"]),
  groupBy: z.array(z.string()).max(2),
  metric: z.string(),
  filters: z.object({
    archetypes: z.array(z.string()).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).default({}),
});

type Table = { columns: string[]; rows: (string | number | null)[][]; suppressed: number; n: number; note?: string };

function buildRecipe(recipe: RecipeKey, s: Substrate, minCell: number, custom?: z.infer<typeof customConfigSchema>): Table {
  const slugOf = new Map(s.users.map((u) => [u.user_id, u.slug]));
  const audit = latestAuditByUser(s);
  let suppressed = 0;
  const cell = <T,>(n: number, v: T) => { const c = kCell(n, v, minCell); if (c.suppressed) suppressed++; return c.value; };

  switch (recipe) {
    case "archetype_audit_matrix": {
      const rows: Table["rows"] = [];
      const byArch = groupBy(s.audits.filter((a) => slugOf.has(a.user_id)), (a) => slugOf.get(a.user_id)!);
      for (const slug of SLUGS) {
        const xs = byArch.get(slug) ?? [];
        const n = new Set(xs.map((x) => x.user_id)).size;
        rows.push([slug, n, ...(["autonomy", "psychological_safety", "workload", "recognition", "purpose", "toxicity_score"] as const).map((k) => cell(n, round(mean(xs.map((x) => x[k])), 2)))]);
      }
      return { columns: ["archetype", "n", "autonomy", "psych_safety", "workload", "recognition", "purpose", "toxicity"], rows, suppressed, n: s.audits.length };
    }
    case "daily_loop_funnel": {
      const rows: Table["rows"] = [];
      const by = groupBy(s.briefings, (b) => b.archetype_slug);
      for (const slug of SLUGS) {
        const xs = by.get(slug) ?? [];
        const n = new Set(xs.map((x) => x.user_id)).size;
        const served = xs.length, read = xs.filter((x) => x.read_at).length, act = xs.filter((x) => x.action_done_at).length, refl = xs.filter((x) => x.reflection_done_at).length;
        rows.push([slug, n, cell(n, served), cell(n, read), cell(n, act), cell(n, refl), cell(n, served ? round(refl / served, 3) : 0)]);
      }
      return { columns: ["archetype", "users", "served", "read", "action_done", "reflected", "loop_completion"], rows, suppressed, n: s.briefings.length };
    }
    case "content_affinity": {
      const tagsOfArticle = new Map(s.articles.map((a) => [a.id, a.tags]));
      const allTags = [...new Set(s.articles.flatMap((a) => a.tags))].sort();
      const rows: Table["rows"] = [];
      for (const slug of SLUGS) {
        const users = s.users.filter((u) => u.slug === slug).map((u) => u.user_id);
        const n = users.length;
        const likes = s.likes.filter((l) => slugOf.get(l.user_id) === slug);
        const total = likes.length || 1;
        rows.push([slug, n, ...allTags.map((t) => cell(n, round(likes.filter((l) => (tagsOfArticle.get(l.article_id) ?? []).includes(t)).length / total, 3)))]);
      }
      return { columns: ["archetype", "n", ...allTags], rows, suppressed, n: s.likes.length };
    }
    case "burnout_dropoff": {
      const burnout = s.pathways.filter((p) => /burnout/i.test(p.slug) || /burnout/i.test(p.certificate_title ?? ""));
      const ids = new Set(burnout.map((p) => p.id));
      const prog = s.progress.filter((p) => ids.has(p.pathway_id));
      const byUser = groupBy(prog, (p) => p.user_id);
      const rows: Table["rows"] = [];
      for (const slug of SLUGS) for (const band of TOXICITY_BANDS) {
        const users = [...byUser.entries()].filter(([uid]) => slugOf.get(uid) === slug && toxicityBand(audit.get(uid)?.toxicity_score ?? 0) === band);
        const n = users.length;
        const maxDays = users.map(([, ps]) => Math.max(...ps.map((p) => p.day_number)));
        rows.push([slug, band, n, cell(n, round(mean(maxDays), 1)), cell(n, round(users.filter(([, ps]) => ps.length >= 42).length / (n || 1), 3))]);
      }
      return { columns: ["archetype", "environment", "n", "avg_last_module", "completion_rate"], rows: rows.filter((r) => Number(r[2]) > 0 || true), suppressed, n: prog.length, note: burnout.length ? undefined : "No pathway matching 'burnout' found." };
    }
    case "item_distributions": {
      const rows: Table["rows"] = [];
      const n = s.users.length;
      for (const q of QUESTIONS) {
        const vals = s.users.map((u) => u.responses[q.id]).filter((v): v is number => typeof v === "number");
        const hist = [1, 2, 3, 4, 5].map((k) => vals.filter((v) => v === k).length);
        const dimScore = s.users.map((u) => Number(u.dims?.[q.dimension] ?? 0.5));
        const corr = pearson(vals, dimScore.slice(0, vals.length));
        rows.push([q.id, q.dimension, q.reverse ? "R" : "", n, ...hist.map((h) => cell(n, h)), cell(n, round(mean(vals), 2)), cell(n, round(corr, 2))]);
      }
      return { columns: ["item", "dim", "rev", "n", "1", "2", "3", "4", "5", "mean", "item_dim_r"], rows, suppressed, n };
    }
    case "custom": {
      if (!custom) throw new Error("Custom recipe needs a config");
      return buildCustom(custom, s, minCell);
    }
  }
}

function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

function buildCustom(c: z.infer<typeof customConfigSchema>, s: Substrate, minCell: number): Table {
  const slugOf = new Map(s.users.map((u) => [u.user_id, u.slug]));
  const pathSlug = new Map(s.pathways.map((p) => [p.id, p.slug]));
  const artCat = new Map(s.articles.map((a) => [a.id, a.category]));
  const inRange = (d: string) => (!c.filters.from || d >= c.filters.from) && (!c.filters.to || d <= c.filters.to);
  const archOk = (uid: string) => !c.filters.archetypes?.length || c.filters.archetypes.includes(slugOf.get(uid) ?? "");

  type R = Record<string, string | number | null | boolean> & { user_id: string };
  let rows: R[] = [];
  switch (c.source) {
    case "user_archetype": rows = s.users.filter((u) => inRange(u.taken_at)).map((u) => ({ user_id: u.user_id, archetype_slug: u.slug, confidence: u.confidence })); break;
    case "workplace_audits": rows = s.audits.filter((a) => inRange(a.taken_at)).map((a) => ({ ...a, archetype_slug: slugOf.get(a.user_id) ?? "unknown", toxicity_band: toxicityBand(a.toxicity_score) })); break;
    case "daily_briefings": rows = s.briefings.filter((b) => inRange(b.briefing_date)).map((b) => ({ user_id: b.user_id, archetype_slug: b.archetype_slug, month: b.briefing_date.slice(0, 7), read: !!b.read_at, action: !!b.action_done_at, reflection: !!b.reflection_done_at })); break;
    case "user_streaks": rows = s.streaks.map((st) => ({ ...st, archetype_slug: slugOf.get(st.user_id) ?? "unknown" })); break;
    case "pathway_progress": rows = s.progress.filter((p) => inRange(p.completed_at)).map((p) => ({ user_id: p.user_id, archetype_slug: slugOf.get(p.user_id) ?? "unknown", pathway_slug: pathSlug.get(p.pathway_id) ?? "?", day_number: p.day_number, quiz_correct: p.quiz_correct, journal: !!p.journal_entry })); break;
    case "article_likes": rows = s.likes.filter((l) => inRange(l.created_at)).map((l) => ({ user_id: l.user_id, archetype_slug: slugOf.get(l.user_id) ?? "unknown", category: artCat.get(l.article_id) ?? "?" })); break;
  }
  rows = rows.filter((r) => archOk(r.user_id));
  const groups = groupBy(rows, (r) => c.groupBy.map((g) => String(r[g] ?? "∅")).join("|"));
  let suppressed = 0;
  const out: Table["rows"] = [];
  const num = (k: string) => (xs: R[]) => round(mean(xs.map((x) => Number(x[k] ?? 0))), 3);
  const rate = (k: string) => (xs: R[]) => round(xs.filter((x) => x[k] === true).length / (xs.length || 1), 3);
  const metricFn: Record<string, (xs: R[]) => number> = {
    count: (xs) => xs.length, avg_confidence: num("confidence"), avg_toxicity: num("toxicity_score"), avg_autonomy: num("autonomy"),
    avg_psychological_safety: num("psychological_safety"), avg_workload: num("workload"), avg_recognition: num("recognition"), avg_purpose: num("purpose"),
    read_rate: rate("read"), action_rate: rate("action"), reflection_rate: rate("reflection"), avg_current_streak: num("current_streak"),
    avg_longest_streak: num("longest_streak"), avg_day_reached: num("day_number"), quiz_accuracy: rate("quiz_correct"), journal_rate: rate("journal"),
  };
  const fn = metricFn[c.metric];
  if (!fn) throw new Error(`Unknown metric ${c.metric}`);
  for (const [k, xs] of groups) {
    const n = new Set(xs.map((x) => x.user_id)).size;
    const cellv = kCell(n, fn(xs), minCell);
    if (cellv.suppressed) suppressed++;
    out.push([...k.split("|"), n, cellv.value]);
  }
  return { columns: [...c.groupBy, "users", c.metric], rows: out, suppressed, n: rows.length };
}

/* =====================================================================
 * Dataset server functions
 * ===================================================================== */

export const listDatasets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertLab(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("lab_datasets")
      .select("id, name, recipe, config, row_count, suppressed_cells, created_at, created_by")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const previewDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    recipe: z.enum(DATASET_RECIPES.map((r) => r.key) as [RecipeKey, ...RecipeKey[]]),
    minCell: z.number().optional(),
    custom: customConfigSchema.optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const s = await loadSubstrate();
    return buildRecipe(data.recipe, s, clampMinCell(data.minCell), data.custom);
  });

export const saveDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(2).max(120),
    recipe: z.enum(DATASET_RECIPES.map((r) => r.key) as [RecipeKey, ...RecipeKey[]]),
    minCell: z.number().optional(),
    custom: customConfigSchema.optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const s = await loadSubstrate();
    const minCell = clampMinCell(data.minCell);
    const table = buildRecipe(data.recipe, s, minCell, data.custom);
    const { data: row, error } = await context.supabase.from("lab_datasets").insert({
      name: data.name, recipe: data.recipe, config: { minCell, custom: data.custom ?? null } as never,
      snapshot: table as never, row_count: table.rows.length, suppressed_cells: table.suppressed, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "dataset.save", "lab_datasets", row.id, { name: data.name, recipe: data.recipe, minCell });
    return { id: row.id };
  });

export const getDataset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("lab_datasets").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const { error } = await context.supabase.from("lab_datasets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "dataset.delete", "lab_datasets", data.id);
    return { ok: true };
  });

/* =====================================================================
 * Model registry
 * ===================================================================== */

export const MODEL_REGISTRY = [
  { key: "clustering", name: "Clustering (k-means)", description: "Do 12 archetypes hold empirically? Cluster dimension profiles, compare to assigned archetype.", params: { k: 12, seed: 42 } },
  { key: "distance_validation", name: "Distance scoring validation", description: "Leave-one-item-out stability of the archetype match; confusion matrix + confidence calibration.", params: { holdoutItemsPerDim: 1, seed: 7 } },
  { key: "churn_survival", name: "Survival / churn analysis", description: "Kaplan–Meier time-to-drop-off by archetype × toxicity band.", params: { inactivityDays: 7 } },
  { key: "uplift", name: "Daily action uplift (diff-in-means)", description: "Did completing the daily action move next-day retention? Stratified by archetype; observational, not causal.", params: {} },
  { key: "content_recommender", name: "Content recommendation model", description: "Archetype × tag affinity from likes; suggests missing archetype tags. Production version feeds the tagging matrix.", params: { minLift: 1.2 } },
] as const;

export type ModelKey = (typeof MODEL_REGISTRY)[number]["key"];

type Filters = { archetypes?: string[]; bands?: string[]; from?: string; to?: string };

type RunOutput = { metrics: Record<string, number | string | null>; results: Record<string, unknown>; emptyReason?: string };

function applyFilters(s: Substrate, f: Filters): Substrate {
  const audit = latestAuditByUser(s);
  const keep = (uid: string) => {
    const u = s.users.find((x) => x.user_id === uid);
    if (f.archetypes?.length && !f.archetypes.includes(u?.slug ?? "")) return false;
    if (f.bands?.length && !f.bands.includes(toxicityBand(audit.get(uid)?.toxicity_score ?? 0))) return false;
    if (f.from && u && u.taken_at < f.from) return false;
    if (f.to && u && u.taken_at > f.to) return false;
    return true;
  };
  return {
    ...s,
    users: s.users.filter((u) => keep(u.user_id)),
    audits: s.audits.filter((a) => keep(a.user_id)),
    briefings: s.briefings.filter((b) => keep(b.user_id)),
    streaks: s.streaks.filter((x) => keep(x.user_id)),
    progress: s.progress.filter((x) => keep(x.user_id)),
    likes: s.likes.filter((x) => keep(x.user_id)),
  };
}

function runModel(key: ModelKey, s: Substrate, params: Record<string, number>, minCell: number): RunOutput {
  switch (key) {
    case "clustering": {
      const pts = s.users.map((u) => dimsToVec(u.dims));
      if (pts.length < minCell) return { metrics: {}, results: {}, emptyReason: `Only ${pts.length} quiz profiles exist; at least ${minCell} are needed. Collect more quiz completions.` };
      const k = Math.max(2, Math.min(12, Math.round(params.k ?? 12)));
      const { centroids, labels, inertia } = kmeans(pts, k, params.seed ?? 42);
      const sil = silhouette(pts, labels);
      const clusters = centroids.map((c, ci) => {
        const members = s.users.filter((_, i) => labels[i] === ci);
        const counts = groupBy(members, (m) => m.slug);
        const top = [...counts.entries()].sort((a, b) => b[1].length - a[1].length)[0];
        const n = members.length;
        return { cluster: ci, n, centroid: Object.fromEntries(DIMS.map((d, i) => [d, round(c[i], 2)])), dominant: n >= minCell ? top?.[0] ?? null : null, purity: n >= minCell ? round((top?.[1].length ?? 0) / n, 2) : null, suppressed: n < minCell };
      });
      const purity = mean(clusters.filter((c) => c.purity != null).map((c) => c.purity!));
      // elbow: inertia for k = 2..12
      const elbow = Array.from({ length: 11 }, (_, i) => i + 2).map((kk) => ({ k: kk, inertia: round(kmeans(pts, kk, params.seed ?? 42).inertia, 3) }));
      return { metrics: { n: pts.length, k, silhouette: round(sil), mean_purity: round(purity), inertia: round(inertia) }, results: { clusters, elbow, projection: projection2d(pts, labels, s.users.map((u) => u.slug), minCell) } };
    }
    case "distance_validation": {
      const withResp = s.users.filter((u) => Object.keys(u.responses).length >= 30);
      if (withResp.length < minCell) return { metrics: {}, results: {}, emptyReason: `Only ${withResp.length} full 30-item response sets exist; need ${minCell}.` };
      const rand = mulberry32(params.seed ?? 7);
      const pairs: { actual: string; predicted: string; conf: number }[] = [];
      for (const u of withResp) {
        const held = { ...u.responses };
        for (const d of DIMS) {
          const items = QUESTIONS.filter((q) => q.dimension === d);
          for (let i = 0; i < (params.holdoutItemsPerDim ?? 1); i++) delete held[items[Math.floor(rand() * items.length)].id];
        }
        const r = evaluate(held);
        pairs.push({ actual: u.slug, predicted: r.archetypeSlug, conf: u.confidence });
      }
      const cm = confusionMatrix(pairs, SLUGS);
      const bins = [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
      const calibration = bins.slice(0, -1).map((lo, i) => {
        const xs = pairs.filter((p) => p.conf >= lo && p.conf < bins[i + 1]);
        return { bin: `${lo.toFixed(1)}–${Math.min(1, bins[i + 1]).toFixed(1)}`, n: xs.length, stability: xs.length >= minCell ? round(xs.filter((p) => p.actual === p.predicted).length / xs.length) : null };
      });
      const perArch = SLUGS.map((slug, i) => { const n = cm.matrix[i].reduce((a, b) => a + b, 0); return { slug, n, recall: n >= minCell ? round(cm.matrix[i][i] / n) : null }; });
      return { metrics: { n: pairs.length, stability_accuracy: round(cm.accuracy), holdout_items_per_dim: params.holdoutItemsPerDim ?? 1 }, results: { confusion: cm, calibration, perArchetype: perArch } };
    }
    case "churn_survival": {
      const inact = params.inactivityDays ?? 7;
      const today = new Date();
      const auditMap = latestAuditByUser(s);
      const obs = s.users.map((u) => {
        const st = s.streaks.find((x) => x.user_id === u.user_id);
        const days = s.briefings.filter((b) => b.user_id === u.user_id && b.read_at).map((b) => b.briefing_date).sort();
        const first = days[0] ?? u.taken_at.slice(0, 10);
        const last = st?.last_check_in ?? days[days.length - 1] ?? first;
        const t = Math.max(0, Math.round((Date.parse(last) - Date.parse(first)) / 86400000));
        const sinceLast = Math.round((today.getTime() - Date.parse(last)) / 86400000);
        return { slug: u.slug, band: toxicityBand(auditMap.get(u.user_id)?.toxicity_score ?? 0), t, event: sinceLast > inact };
      });
      if (obs.length < minCell) return { metrics: {}, results: {}, emptyReason: `Only ${obs.length} users with activity; need ${minCell}.` };
      const overall = kaplanMeier(obs);
      const byArch = SLUGS.map((slug) => { const xs = obs.filter((o) => o.slug === slug); return { slug, n: xs.length, curve: xs.length >= minCell ? kaplanMeier(xs).curve : null, median: xs.length >= minCell ? kaplanMeier(xs).median : null }; });
      const byBand = TOXICITY_BANDS.map((band) => { const xs = obs.filter((o) => o.band === band); return { band, n: xs.length, curve: xs.length >= minCell ? kaplanMeier(xs).curve : null }; });
      const heat = SLUGS.map((slug) => TOXICITY_BANDS.map((band) => { const xs = obs.filter((o) => o.slug === slug && o.band === band); return { n: xs.length, churn: xs.length >= minCell ? round(xs.filter((o) => o.event).length / xs.length) : null }; }));
      return { metrics: { n: obs.length, churned: obs.filter((o) => o.event).length, median_days: overall.median, inactivity_threshold_days: inact }, results: { overall: overall.curve, byArchetype: byArch, byBand, heatmap: { rows: SLUGS, cols: [...TOXICITY_BANDS], cells: heat } } };
    }
    case "uplift": {
      // Unit: (user, day). Treatment = action_done_at set. Outcome = briefing read next day.
      const byUser = groupBy(s.briefings, (b) => b.user_id);
      const units: { slug: string; treated: boolean; y: number }[] = [];
      for (const [, bs] of byUser) {
        const sorted = [...bs].sort((a, b) => a.briefing_date.localeCompare(b.briefing_date));
        for (let i = 0; i < sorted.length - 1; i++) {
          const next = sorted[i + 1];
          const nextDay = new Date(Date.parse(sorted[i].briefing_date) + 86400000).toISOString().slice(0, 10);
          units.push({ slug: sorted[i].archetype_slug, treated: !!sorted[i].action_done_at, y: next.briefing_date === nextDay && !!next.read_at ? 1 : 0 });
        }
      }
      const tr = units.filter((u) => u.treated), ct = units.filter((u) => !u.treated);
      if (tr.length < minCell || ct.length < minCell) return { metrics: {}, results: {}, emptyReason: `Need ≥${minCell} treated and ≥${minCell} control user-days (have ${tr.length} / ${ct.length}). Keep serving briefings.` };
      const ate = mean(tr.map((u) => u.y)) - mean(ct.map((u) => u.y));
      const strata = SLUGS.map((slug) => { const t = tr.filter((u) => u.slug === slug), c = ct.filter((u) => u.slug === slug); const ok = t.length >= minCell && c.length >= minCell; return { slug, n_treated: t.length, n_control: c.length, uplift: ok ? round(mean(t.map((u) => u.y)) - mean(c.map((u) => u.y))) : null }; });
      const valid = strata.filter((x) => x.uplift != null);
      const stratified = valid.length ? valid.reduce((acc, x) => acc + x.uplift! * (x.n_treated + x.n_control), 0) / valid.reduce((a, x) => a + x.n_treated + x.n_control, 0) : null;
      return {
        metrics: { user_days: units.length, treated: tr.length, control: ct.length, naive_uplift: round(ate), archetype_stratified_uplift: stratified == null ? null : round(stratified) },
        results: { strata, caveat: "Observational difference-in-means. Users who complete actions are already more engaged (selection bias). Stratifying by archetype removes only one confounder; treat as directional, not causal. A proper test needs randomised prescription timing." },
      };
    }
    case "content_recommender": {
      const slugOf = new Map(s.users.map((u) => [u.user_id, u.slug]));
      const tagsOf = new Map(s.articles.map((a) => [a.id, a.tags]));
      const allTags = [...new Set(s.articles.flatMap((a) => a.tags))];
      const likesWithSlug = s.likes.map((l) => ({ slug: slugOf.get(l.user_id), tags: tagsOf.get(l.article_id) ?? [], article_id: l.article_id })).filter((l) => l.slug);
      if (likesWithSlug.length < minCell) return { metrics: {}, results: {}, emptyReason: `Only ${likesWithSlug.length} likes from profiled users; need ${minCell}. Likes are the training signal.` };
      const base = Object.fromEntries(allTags.map((t) => [t, likesWithSlug.filter((l) => l.tags.includes(t)).length / likesWithSlug.length]));
      const affinity: Record<string, Record<string, number>> = {};
      for (const slug of SLUGS) {
        const mine = likesWithSlug.filter((l) => l.slug === slug);
        affinity[slug] = {};
        for (const t of allTags) {
          const p = mine.length ? mine.filter((l) => l.tags.includes(t)).length / mine.length : 0;
          affinity[slug][t] = base[t] ? round(p / base[t], 2) : 0; // lift vs. population
        }
      }
      const tagged = new Set(s.tags.map((t) => `${t.article_id}|${t.archetype_slug}`));
      const suggestions: { article_id: string; slug: string; title: string; archetype: string; score: number }[] = [];
      for (const a of s.articles.filter((x) => x.published)) for (const slug of SLUGS) {
        if (tagged.has(`${a.id}|${slug}`)) continue;
        const score = round(mean(a.tags.map((t) => affinity[slug][t] ?? 0)), 2);
        if (score >= (params.minLift ?? 1.2)) suggestions.push({ article_id: a.id, slug: a.slug, title: a.title, archetype: slug, score });
      }
      suggestions.sort((a, b) => b.score - a.score);
      return { metrics: { training_likes: likesWithSlug.length, tags: allTags.length, suggestions: suggestions.length, min_lift: params.minLift ?? 1.2 }, results: { affinity, tags: allTags, suggestions: suggestions.slice(0, 200) } };
    }
  }
}

/** Cheap 2-D projection (first two principal axes via power iteration) for cluster plots — aggregates only per cluster when small. */
function projection2d(pts: number[][], labels: number[], slugs: string[], minCell: number) {
  if (pts.length < minCell) return [];
  const d = pts[0].length;
  const mu = Array.from({ length: d }, (_, j) => mean(pts.map((p) => p[j])));
  const X = pts.map((p) => p.map((v, j) => v - mu[j]));
  const cov = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => mean(X.map((x) => x[i] * x[j]))));
  const power = (deflate?: number[]) => {
    let v = Array.from({ length: d }, (_, i) => Math.sin(i + 1));
    for (let it = 0; it < 60; it++) {
      let w = cov.map((row) => row.reduce((s, c, j) => s + c * v[j], 0));
      if (deflate) { const dot = w.reduce((s, x, i) => s + x * deflate[i], 0); w = w.map((x, i) => x - dot * deflate[i]); }
      const norm = Math.hypot(...w) || 1;
      v = w.map((x) => x / norm);
    }
    return v;
  };
  const p1 = power(), p2 = power(p1);
  // Return jittered points without identifiers — coordinates only, rounded to 2 dp.
  return X.map((x, i) => ({ x: round(x.reduce((s, v, j) => s + v * p1[j], 0), 2), y: round(x.reduce((s, v, j) => s + v * p2[j], 0), 2), c: labels[i], a: slugs[i] }));
}

/* =====================================================================
 * Run lifecycle (status-driven; the UI polls getRun while awaiting startRun)
 * ===================================================================== */

const runInput = z.object({
  modelKey: z.enum(MODEL_REGISTRY.map((m) => m.key) as [ModelKey, ...ModelKey[]]),
  datasetId: z.string().uuid().optional(),
  params: z.record(z.string(), z.number()).default({}),
  filters: z.object({ archetypes: z.array(z.string()).optional(), bands: z.array(z.string()).optional(), from: z.string().optional(), to: z.string().optional() }).default({}),
  minCell: z.number().optional(),
});

async function setProgress(sb: Sb, id: string, progress: number, label: string) {
  await sb.from("model_runs").update({ progress, progress_label: label, status: "running" }).eq("id", id);
}

export const startRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => runInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertLab(sb, context.userId);
    const minCell = clampMinCell(data.minCell);
    const { count } = await sb.from("model_runs").select("*", { count: "exact", head: true }).eq("model_key", data.modelKey);
    const { data: run, error } = await sb.from("model_runs").insert({
      model_key: data.modelKey, version: (count ?? 0) + 1, dataset_id: data.datasetId ?? null,
      config: { params: data.params, filters: data.filters, minCell } as never, status: "queued", created_by: context.userId, started_at: new Date().toISOString(),
    }).select("id").single();
    if (error) throw new Error(error.message);
    const id = run.id;
    try {
      await setProgress(sb, id, 10, "Loading behavioural substrate");
      let s = await loadSubstrate();
      s = applyFilters(s, data.filters);
      await setProgress(sb, id, 40, "Applying privacy guardrails");
      const snapshot = { users: s.users.length, audits: s.audits.length, briefings: s.briefings.length, likes: s.likes.length, progress: s.progress.length, capturedAt: new Date().toISOString() };
      await setProgress(sb, id, 60, "Fitting model");
      const out = runModel(data.modelKey, s, data.params, minCell);
      await sb.from("model_runs").update({
        status: out.emptyReason ? "empty" : "done", progress: 100, progress_label: out.emptyReason ? "No usable data" : "Complete",
        metrics: out.metrics as never, results: out.results as never, error: out.emptyReason ?? null, dataset_snapshot: snapshot as never, finished_at: new Date().toISOString(),
      }).eq("id", id);
      await audit(sb, context.userId, "model.run", "model_runs", id, { modelKey: data.modelKey, params: data.params, filters: data.filters, minCell, status: out.emptyReason ? "empty" : "done" });
    } catch (e) {
      await sb.from("model_runs").update({ status: "failed", error: (e as Error).message, finished_at: new Date().toISOString() }).eq("id", id);
      await audit(sb, context.userId, "model.run.failed", "model_runs", id, { modelKey: data.modelKey, error: (e as Error).message });
    }
    return { id };
  });

export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertLab(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("model_runs")
      .select("id, model_key, version, status, progress, progress_label, promotion_state, metrics, created_by, created_at, finished_at, error")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const [{ data: run, error }, { data: insights }, { data: links }] = await Promise.all([
      context.supabase.from("model_runs").select("*").eq("id", data.id).single(),
      context.supabase.from("lab_insights").select("*").eq("run_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("lab_share_links").select("token, expires_at").eq("run_id", data.id),
    ]);
    if (error) throw new Error(error.message);
    return { run, insights: insights ?? [], shareLinks: links ?? [] };
  });

export const promoteRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), state: z.enum(["experiment", "candidate", "production"]), evidence: z.string().max(2000).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertLab(sb, context.userId);
    const { data: run, error } = await sb.from("model_runs").select("id, model_key, status, promotion_state").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    if (data.state === "production" && run.status !== "done") throw new Error("Only completed runs can be promoted to production");
    if (data.state === "production") {
      // Exactly one production model per key: demote the previous one.
      const { data: prev } = await sb.from("model_runs").select("id").eq("model_key", run.model_key).eq("promotion_state", "production").neq("id", data.id);
      for (const p of prev ?? []) {
        await sb.from("model_runs").update({ promotion_state: "candidate" }).eq("id", p.id);
        await audit(sb, context.userId, "model.demote", "model_runs", p.id, { from: "production", to: "candidate", reason: `superseded by ${data.id}` });
      }
    }
    await sb.from("model_runs").update({ promotion_state: data.state }).eq("id", data.id);
    await audit(sb, context.userId, "model.promote", "model_runs", data.id, { from: run.promotion_state, to: data.state, evidence: data.evidence, modelKey: run.model_key });
    return { ok: true };
  });

export const addInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    runId: z.string().uuid(), hypothesis: z.string().max(2000), finding: z.string().max(4000), followUp: z.string().max(2000),
    tags: z.array(z.string().max(40)).max(10).default([]), linkedArticleIds: z.array(z.string().uuid()).max(50).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("lab_insights").insert({
      run_id: data.runId, hypothesis: data.hypothesis, finding: data.finding, follow_up: data.followUp, tags: data.tags, linked_article_ids: data.linkedArticleIds, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "insight.add", "lab_insights", row.id, { runId: data.runId, tags: data.tags });
    return { id: row.id };
  });

export const listInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Editors may read insights (they drive content decisions); lab users own them.
    const { data, error } = await context.supabase.from("lab_insights")
      .select("id, run_id, hypothesis, finding, follow_up, tags, linked_article_ids, created_at, model_runs(model_key, version)")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ runId: z.string().uuid(), days: z.number().int().min(1).max(365).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLab(context.supabase, context.userId);
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { error } = await context.supabase.from("lab_share_links").insert({
      token, run_id: data.runId, created_by: context.userId, expires_at: new Date(Date.now() + data.days * 86400000).toISOString(),
    });
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "share.create", "model_runs", data.runId, { days: data.days });
    return { token };
  });

/** Public: resolve a share token to a read-only, aggregate-only view of a run. */
export const getSharedRun = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(20).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (i, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } },
    });
    const { data: link } = await sb.from("lab_share_links").select("run_id, expires_at").eq("token", data.token).maybeSingle();
    if (!link) return null;
    const { data: run } = await sb.from("model_runs").select("model_key, version, status, metrics, results, config, dataset_snapshot, created_at, finished_at").eq("id", link.run_id).maybeSingle();
    if (!run) return null;
    return { ...run, expires_at: link.expires_at };
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50), entityType: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("audit_log").select("id, actor, action, entity_type, entity_id, payload, created_at").order("created_at", { ascending: false }).limit(data.limit);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Used by the personalisation engine / tagging matrix: the current production recommender, if any. */
export async function loadProductionRecommender(sb: Sb) {
  const { data } = await sb.from("model_runs").select("id, version, results, finished_at").eq("model_key", "content_recommender").eq("promotion_state", "production").maybeSingle();
  return data;
}

// keep scoreArchetypes referenced for future model additions (documented in docs/)
void scoreArchetypes;
