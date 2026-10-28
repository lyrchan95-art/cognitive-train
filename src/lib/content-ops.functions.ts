// Content Update Console — bulk/batch operations. Gated by requireSupabaseAuth + is_content_editor().
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEditor, audit, type Sb } from "@/lib/staff-guards";
import { ARCHETYPES } from "@/data/archetypes";
import { loadProductionRecommender } from "@/lib/lab.functions";

const SLUGS = ARCHETYPES.map((a) => a.slug);
export const MIN_ARTICLES_PER_ARCHETYPE = 10;

/* ================= Articles: list + bulk ================= */

export const listContentArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const [{ data: arts, error }, { data: tags }] = await Promise.all([
      sb.from("articles").select("id, slug, title, excerpt, category, read_minutes, tags, published, sort_order, updated_at, created_at, archived_at").order("sort_order"),
      sb.from("article_archetypes").select("article_id, archetype_slug"),
    ]);
    if (error) throw new Error(error.message);
    // Like counts are aggregates; article_likes rows are user-private, so count them with the admin client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: likes } = await supabaseAdmin.from("article_likes").select("article_id, created_at");
    const now = Date.now();
    const likeCount = new Map<string, { total: number; last30: number; prev30: number }>();
    for (const l of likes ?? []) {
      const c = likeCount.get(l.article_id) ?? { total: 0, last30: 0, prev30: 0 };
      const age = (now - Date.parse(l.created_at)) / 86400000;
      c.total++; if (age <= 30) c.last30++; else if (age <= 60) c.prev30++;
      likeCount.set(l.article_id, c);
    }
    const byArt = new Map<string, string[]>();
    for (const t of tags ?? []) byArt.set(t.article_id, [...(byArt.get(t.article_id) ?? []), t.archetype_slug]);
    return (arts ?? []).map((a) => ({ ...a, archetype_slugs: byArt.get(a.id) ?? [], likes: likeCount.get(a.id) ?? { total: 0, last30: 0, prev30: 0 } }));
  });

const bulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), ids: z.array(z.string().uuid()).min(1) }),
  z.object({ action: z.literal("unpublish"), ids: z.array(z.string().uuid()).min(1) }),
  z.object({ action: z.literal("archive"), ids: z.array(z.string().uuid()).min(1) }),
  z.object({ action: z.literal("restore"), ids: z.array(z.string().uuid()).min(1) }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string().uuid()).min(1), confirm: z.literal("DELETE") }),
  z.object({ action: z.literal("set_category"), ids: z.array(z.string().uuid()).min(1), category: z.string().min(1).max(80) }),
  z.object({ action: z.literal("retag"), ids: z.array(z.string().uuid()).min(1), mode: z.enum(["add", "remove", "set"]), archetypes: z.array(z.string()) }),
  z.object({ action: z.literal("set_tags"), ids: z.array(z.string().uuid()).min(1), tags: z.array(z.string().max(40)).max(20) }),
  z.object({ action: z.literal("schedule"), ids: z.array(z.string().uuid()).min(1), publishAt: z.string(), op: z.enum(["publish", "unpublish"]).default("publish") }),
]);

export const bulkArticleAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const ids = data.ids;
    const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
    switch (data.action) {
      case "publish": fail((await sb.from("articles").update({ published: true, archived_at: null }).in("id", ids)).error); break;
      case "unpublish": fail((await sb.from("articles").update({ published: false }).in("id", ids)).error); break;
      case "archive": fail((await sb.from("articles").update({ published: false, archived_at: new Date().toISOString() }).in("id", ids)).error); break;
      case "restore": fail((await sb.from("articles").update({ archived_at: null }).in("id", ids)).error); break;
      case "delete": fail((await sb.from("articles").delete().in("id", ids)).error); break;
      case "set_category": fail((await sb.from("articles").update({ category: data.category }).in("id", ids)).error); break;
      case "set_tags": fail((await sb.from("articles").update({ tags: data.tags }).in("id", ids)).error); break;
      case "retag": {
        const slugs = data.archetypes.filter((s) => SLUGS.includes(s));
        if (data.mode === "set" || data.mode === "remove") {
          let q = sb.from("article_archetypes").delete().in("article_id", ids);
          if (data.mode === "remove") q = q.in("archetype_slug", slugs);
          fail((await q).error);
        }
        if (data.mode !== "remove" && slugs.length) {
          const rows = ids.flatMap((id) => slugs.map((s) => ({ article_id: id, archetype_slug: s })));
          fail((await sb.from("article_archetypes").upsert(rows, { onConflict: "article_id,archetype_slug", ignoreDuplicates: true })).error);
        }
        break;
      }
      case "schedule": {
        const { data: arts } = await sb.from("articles").select("id, title").in("id", ids);
        fail((await sb.from("scheduled_publishes").insert((arts ?? []).map((a) => ({ entity_type: "articles", entity_id: a.id, entity_title: a.title, action: data.op, scheduled_for: data.publishAt, created_by: context.userId }))) ).error);
        break;
      }
    }
    await audit(sb, context.userId, `article.bulk.${data.action}`, "articles", null, { ...data, count: ids.length });
    return { ok: true, count: ids.length };
  });

/* ================= Tagging matrix ================= */

export const getTaggingMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const [{ data: arts, error }, { data: tags }, prod] = await Promise.all([
      sb.from("articles").select("id, slug, title, published, archived_at").is("archived_at", null).order("sort_order"),
      sb.from("article_archetypes").select("article_id, archetype_slug"),
      loadProductionRecommender(sb),
    ]);
    if (error) throw new Error(error.message);
    const suggestions = ((prod?.results as { suggestions?: { article_id: string; archetype: string; score: number }[] } | null)?.suggestions ?? []);
    const counts = Object.fromEntries(SLUGS.map((s) => [s, 0])) as Record<string, number>;
    const publishedIds = new Set((arts ?? []).filter((a) => a.published).map((a) => a.id));
    for (const t of tags ?? []) if (publishedIds.has(t.article_id) && t.archetype_slug in counts) counts[t.archetype_slug]++;
    return {
      articles: arts ?? [],
      tagged: (tags ?? []).map((t) => `${t.article_id}|${t.archetype_slug}`),
      suggested: suggestions.map((s) => ({ key: `${s.article_id}|${s.archetype}`, score: s.score })),
      counts, minimum: MIN_ARTICLES_PER_ARCHETYPE,
      recommender: prod ? { id: prod.id, version: prod.version, finished_at: prod.finished_at } : null,
    };
  });

export const setArticleTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ articleId: z.string().uuid(), archetype: z.string(), tagged: z.boolean(), source: z.enum(["manual", "suggestion"]).default("manual") }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    if (!SLUGS.includes(data.archetype)) throw new Error("Unknown archetype");
    const { error } = data.tagged
      ? await sb.from("article_archetypes").upsert({ article_id: data.articleId, archetype_slug: data.archetype }, { onConflict: "article_id,archetype_slug", ignoreDuplicates: true })
      : await sb.from("article_archetypes").delete().eq("article_id", data.articleId).eq("archetype_slug", data.archetype);
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, data.tagged ? "article.tag" : "article.untag", "articles", data.articleId, { archetype: data.archetype, source: data.source });
    return { ok: true };
  });

/* ================= Content health ================= */

export const getContentHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ staleMonths: z.number().int().min(1).max(36).default(6) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const [{ data: arts }, { data: tags }, { data: paths }, { data: days }, { data: research }] = await Promise.all([
      sb.from("articles").select("id, slug, title, published, updated_at, archived_at"),
      sb.from("article_archetypes").select("article_id, archetype_slug"),
      sb.from("pathways").select("id, slug, title, archetype_slug, published, duration_days"),
      sb.from("pathway_days").select("pathway_id, day_number, content, quiz_question, quiz_options, action_prompt"),
      sb.from("research_articles").select("id, category, published"),
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: likes } = await supabaseAdmin.from("article_likes").select("article_id, created_at");
    const live = (arts ?? []).filter((a) => a.published && !a.archived_at);
    const liveIds = new Set(live.map((a) => a.id));
    const articlesPer = Object.fromEntries(SLUGS.map((s) => [s, (tags ?? []).filter((t) => t.archetype_slug === s && liveIds.has(t.article_id)).length]));
    const pathwaysPer = Object.fromEntries(SLUGS.map((s) => [s, (paths ?? []).filter((p) => p.archetype_slug === s && p.published).length]));
    const researchPer: Record<string, number> = {};
    for (const r of research ?? []) if (r.published) researchPer[r.category] = (researchPer[r.category] ?? 0) + 1;
    const cutoff = Date.now() - data.staleMonths * 30 * 86400000;
    const stale = live.filter((a) => Date.parse(a.updated_at) < cutoff).map((a) => ({ id: a.id, slug: a.slug, title: a.title, updated_at: a.updated_at }));
    const now = Date.now();
    const trend = new Map<string, { last30: number; prev30: number }>();
    for (const l of likes ?? []) { const t = trend.get(l.article_id) ?? { last30: 0, prev30: 0 }; const age = (now - Date.parse(l.created_at)) / 86400000; if (age <= 30) t.last30++; else if (age <= 60) t.prev30++; trend.set(l.article_id, t); }
    const declining = live.filter((a) => { const t = trend.get(a.id); return t && t.prev30 >= 3 && t.last30 < t.prev30 * 0.6; }).map((a) => ({ id: a.id, slug: a.slug, title: a.title, ...trend.get(a.id)! }));
    // Duplicates: same normalised title or slug among live articles (Daily Digest and Full Feed draw from this pool).
    const seen = new Map<string, string[]>();
    for (const a of live) { const k = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); seen.set(k, [...(seen.get(k) ?? []), a.slug]); }
    const duplicates = [...seen.entries()].filter(([, v]) => v.length > 1).map(([title, slugs]) => ({ title, slugs }));
    const untagged = live.filter((a) => !(tags ?? []).some((t) => t.article_id === a.id)).map((a) => ({ id: a.id, slug: a.slug, title: a.title }));
    // Pathway validation
    const pathwayIssues = (paths ?? []).map((p) => {
      const ds = (days ?? []).filter((d) => d.pathway_id === p.id);
      const issues: string[] = [];
      for (let n = 1; n <= p.duration_days; n++) {
        const d = ds.find((x) => x.day_number === n);
        if (!d) { issues.push(`Day ${n} missing`); continue; }
        if (!d.content || d.content.trim().length < 200) issues.push(`Day ${n}: content too short`);
        if (!d.quiz_question || !Array.isArray(d.quiz_options) || (d.quiz_options as unknown[]).length < 2) issues.push(`Day ${n}: quiz incomplete`);
        if (!d.action_prompt?.trim()) issues.push(`Day ${n}: journaling prompt missing`);
      }
      return { id: p.id, slug: p.slug, title: p.title, archetype_slug: p.archetype_slug, published: p.published, issues };
    }).filter((p) => p.issues.length);
    return {
      minimum: MIN_ARTICLES_PER_ARCHETYPE, articlesPer, pathwaysPer, researchPer,
      gaps: SLUGS.filter((s) => articlesPer[s] < MIN_ARTICLES_PER_ARCHETYPE),
      stale, staleMonths: data.staleMonths, declining, duplicates, untagged, pathwayIssues,
      totals: { articles: live.length, archived: (arts ?? []).filter((a) => a.archived_at).length, pathways: (paths ?? []).filter((p) => p.published).length, research: (research ?? []).filter((r) => r.published).length },
      digestNote: "Daily Digest picks 3 essays from the archetype pool by day-of-year rotation and the Full Feed hides those 3, so sets are exclusive by construction; duplicates listed above would break that guarantee.",
    };
  });

/* ================= Pathway authoring at scale ================= */

export const duplicatePathway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pathwayId: z.string().uuid(), targetArchetypes: z.array(z.string()).min(1).max(12), publish: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const { data: src, error } = await sb.from("pathways").select("*").eq("id", data.pathwayId).single();
    if (error) throw new Error(error.message);
    const { data: days } = await sb.from("pathway_days").select("*").eq("pathway_id", data.pathwayId);
    const srcName = ARCHETYPES.find((a) => a.slug === src.archetype_slug)?.name ?? src.archetype_slug;
    const created: { slug: string; archetype: string }[] = [];
    for (const target of data.targetArchetypes) {
      if (!SLUGS.includes(target) || target === src.archetype_slug) continue;
      const tName = ARCHETYPES.find((a) => a.slug === target)!.name;
      const swap = (s: string) => s.split(srcName).join(tName).split(src.archetype_slug).join(target);
      const slug = `${src.slug.replace(src.archetype_slug, target)}${src.slug.includes(src.archetype_slug) ? "" : `-${target}`}`;
      const { data: np, error: pe } = await sb.from("pathways").insert({
        slug, title: swap(src.title), description: swap(src.description), archetype_slug: target, icon: src.icon, difficulty: src.difficulty,
        duration_days: src.duration_days, hero_image_url: src.hero_image_url, sort_order: src.sort_order, published: data.publish,
        required_streak: src.required_streak, certificate_title: src.certificate_title,
      }).select("id").single();
      if (pe) throw new Error(`${target}: ${pe.message}`);
      if (days?.length) {
        const { error: de } = await sb.from("pathway_days").insert(days.map((d) => ({
          pathway_id: np.id, day_number: d.day_number, title: swap(d.title), subtitle: d.subtitle, content: swap(d.content), action_prompt: swap(d.action_prompt),
          read_minutes: d.read_minutes, quiz_question: swap(d.quiz_question), quiz_options: d.quiz_options, quiz_answer_index: d.quiz_answer_index,
        })));
        if (de) throw new Error(de.message);
      }
      created.push({ slug, archetype: target });
    }
    await audit(sb, context.userId, "pathway.duplicate", "pathways", data.pathwayId, { created });
    return { created };
  });

export const bulkUpdatePathwayDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    updates: z.array(z.object({ id: z.string().uuid(), day_number: z.number().int().min(1).max(60).optional(), title: z.string().min(1).max(300).optional(), subtitle: z.string().max(120).optional(), read_minutes: z.number().int().min(1).max(60).optional() })).min(1).max(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    for (const u of data.updates) {
      const { id, ...patch } = u;
      const { error } = await sb.from("pathway_days").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    }
    await audit(sb, context.userId, "pathway_days.bulk_update", "pathway_days", null, { count: data.updates.length });
    return { ok: true };
  });

export const listPathwaysForConsole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditor(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("pathways").select("id, slug, title, archetype_slug, duration_days, published, required_streak").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ================= Scheduled publishing ================= */

export const listSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditor(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("scheduled_publishes").select("*").order("scheduled_for");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(), entityType: z.enum(["articles", "pathways", "research_articles"]), entityId: z.string().uuid(), entityTitle: z.string().max(300).default(""),
    action: z.enum(["publish", "unpublish"]).default("publish"), scheduledFor: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const row = { entity_type: data.entityType, entity_id: data.entityId, entity_title: data.entityTitle, action: data.action, scheduled_for: data.scheduledFor, status: "pending", error: null };
    const { error } = data.id ? await sb.from("scheduled_publishes").update(row).eq("id", data.id) : await sb.from("scheduled_publishes").insert({ ...row, created_by: context.userId });
    if (error) throw new Error(error.message);
    await audit(sb, context.userId, data.id ? "schedule.reschedule" : "schedule.create", "scheduled_publishes", data.id ?? null, data);
    return { ok: true };
  });

export const cancelSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId);
    const { error } = await context.supabase.from("scheduled_publishes").update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "schedule.cancel", "scheduled_publishes", data.id);
    return { ok: true };
  });

async function executeScheduled(sb: Sb, actor: string, item: { id: string; entity_type: string; entity_id: string; action: string }) {
  const published = item.action === "publish";
  const table = item.entity_type as "articles" | "pathways" | "research_articles";
  const patch = table === "articles" ? { published, archived_at: null } : { published };
  const { error } = await sb.from(table).update(patch as never).eq("id", item.entity_id);
  if (error) {
    await sb.from("scheduled_publishes").update({ status: "failed", error: error.message, executed_at: new Date().toISOString() }).eq("id", item.id);
    await audit(sb, actor, "schedule.failed", "scheduled_publishes", item.id, { error: error.message });
    return { ok: false, error: error.message };
  }
  await sb.from("scheduled_publishes").update({ status: "done", executed_at: new Date().toISOString() }).eq("id", item.id);
  await audit(sb, actor, "schedule.executed", table, item.entity_id, { action: item.action });
  return { ok: true };
}

/** "Publish now" override for a single queue item. */
export const publishNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId);
    const { data: item, error } = await context.supabase.from("scheduled_publishes").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return executeScheduled(context.supabase, context.userId, item);
  });

/** Runs every due item. Called from the console (and safe to call from a cron hitting the app). */
export const processDueSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditor(context.supabase, context.userId);
    const { data: due } = await context.supabase.from("scheduled_publishes").select("*").eq("status", "pending").lte("scheduled_for", new Date().toISOString());
    const results = [];
    for (const item of due ?? []) results.push({ id: item.id, ...(await executeScheduled(context.supabase, context.userId, item)) });
    return { processed: results.length, failed: results.filter((r) => !r.ok).length, results };
  });

/* ================= Version history & rollback ================= */

export const listVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entityType: z.enum(["articles", "pathways", "pathway_days", "research_articles"]), entityId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEditor(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase.from("content_versions").select("id, version, change_kind, snapshot, changed_by, created_at")
      .eq("entity_type", data.entityType).eq("entity_id", data.entityId).order("version", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listRecentVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditor(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("content_versions").select("id, entity_type, entity_id, version, change_kind, changed_by, created_at, snapshot")
      .order("created_at", { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((v) => ({ ...v, title: (v.snapshot as { title?: string })?.title ?? "", snapshot: undefined }));
  });

const ROLLBACK_FIELDS: Record<string, string[]> = {
  articles: ["slug", "title", "excerpt", "body", "category", "read_minutes", "tags", "published", "sort_order", "tldr", "hero_image_url", "archived_at"],
  pathways: ["slug", "title", "description", "archetype_slug", "icon", "difficulty", "duration_days", "hero_image_url", "sort_order", "published", "required_streak", "certificate_title"],
  pathway_days: ["day_number", "title", "content", "action_prompt", "read_minutes", "subtitle", "quiz_question", "quiz_options", "quiz_answer_index"],
  research_articles: ["slug", "title", "subtitle", "authors", "category", "abstract", "body", "source_url", "citation", "hero_image_url", "published_date", "read_minutes", "published", "sort_order"],
};

export const rollbackVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const { data: v, error } = await sb.from("content_versions").select("*").eq("id", data.versionId).single();
    if (error) throw new Error(error.message);
    const fields = ROLLBACK_FIELDS[v.entity_type];
    if (!fields) throw new Error("Unsupported entity");
    const snap = v.snapshot as Record<string, unknown>;
    const patch = Object.fromEntries(fields.filter((f) => f in snap).map((f) => [f, snap[f]]));
    const table = v.entity_type as "articles" | "pathways" | "pathway_days" | "research_articles";
    const { data: existing } = await sb.from(table).select("id").eq("id", v.entity_id).maybeSingle();
    const res = existing
      ? await sb.from(table).update(patch as never).eq("id", v.entity_id)
      : await sb.from(table).insert({ id: v.entity_id, ...(table === "pathway_days" ? { pathway_id: snap.pathway_id } : {}), ...patch } as never);
    if (res.error) throw new Error(res.error.message);
    await audit(sb, context.userId, "content.rollback", v.entity_type, v.entity_id, { toVersion: v.version, restored: !existing });
    return { ok: true, restored: !existing };
  });

/* ================= Import / export ================= */

const importRow = z.object({
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/, "slug must be lowercase-kebab"),
  title: z.string().min(3).max(300),
  excerpt: z.string().max(600).default(""),
  body: z.string().min(50),
  category: z.string().min(1).max(80).default("essay"),
  read_minutes: z.coerce.number().int().min(1).max(60).default(4),
  tags: z.array(z.string()).default([]),
  archetypes: z.array(z.string()).default([]),
  published: z.coerce.boolean().default(false),
  tldr: z.string().max(600).optional(),
  hero_image_url: z.string().url().optional().or(z.literal("")),
});
export type ImportRow = z.infer<typeof importRow>;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { cur.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; cur.push(field); rows.push(cur); cur = []; field = ""; }
    else field += ch;
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

/** Markdown with YAML-ish front matter: ---\nslug: x\ntitle: y\n...\n---\nbody. Multiple docs separated by a line `=====`. */
function parseMarkdown(text: string): Record<string, string>[] {
  return text.split(/\n=====+\n/).map((doc) => {
    const m = doc.match(/^\s*---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) return { body: doc.trim() };
    const meta = Object.fromEntries(m[1].split("\n").map((l) => { const i = l.indexOf(":"); return i < 0 ? [l.trim(), ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
    return { ...meta, body: m[2].trim() };
  }).filter((d) => d.body);
}

const list = (v: unknown) => typeof v === "string" ? v.split(/[|;,]/).map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : [];

export const previewImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ format: z.enum(["csv", "markdown"]), text: z.string().min(1).max(2_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const raw = data.format === "csv" ? parseCsv(data.text) : parseMarkdown(data.text);
    const { data: existing } = await sb.from("articles").select("slug");
    const known = new Set((existing ?? []).map((a) => a.slug));
    const rows = raw.map((r, i) => {
      const parsed = importRow.safeParse({ ...r, tags: list(r.tags), archetypes: list(r.archetypes), published: r.published === "true" || r.published === "1" });
      if (!parsed.success) return { index: i + 1, ok: false as const, errors: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`), slug: r.slug ?? "" };
      const badArch = parsed.data.archetypes.filter((a) => !SLUGS.includes(a));
      const errors = badArch.length ? [`unknown archetypes: ${badArch.join(", ")}`] : [];
      return { index: i + 1, ok: errors.length === 0, errors, slug: parsed.data.slug, title: parsed.data.title, exists: known.has(parsed.data.slug), row: parsed.data };
    });
    return { total: rows.length, valid: rows.filter((r) => r.ok).length, rows };
  });

export const commitImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(importRow).min(1).max(500), mode: z.enum(["insert_only", "upsert"]).default("upsert") }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    let inserted = 0, updated = 0;
    for (const r of data.rows) {
      const { archetypes, ...fields } = r;
      const { data: ex } = await sb.from("articles").select("id").eq("slug", r.slug).maybeSingle();
      if (ex && data.mode === "insert_only") continue;
      const payload = { ...fields, hero_image_url: fields.hero_image_url || null, tldr: fields.tldr || null };
      const res = ex ? await sb.from("articles").update(payload).eq("id", ex.id).select("id").single() : await sb.from("articles").insert(payload).select("id").single();
      if (res.error) throw new Error(`${r.slug}: ${res.error.message}`);
      ex ? updated++ : inserted++;
      if (archetypes.length) {
        await sb.from("article_archetypes").delete().eq("article_id", res.data.id);
        await sb.from("article_archetypes").insert(archetypes.map((a) => ({ article_id: res.data.id, archetype_slug: a })));
      }
    }
    await audit(sb, context.userId, "content.import", "articles", null, { inserted, updated, mode: data.mode });
    return { inserted, updated };
  });

export const exportLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ format: z.enum(["json", "csv"]).default("json") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertEditor(sb, context.userId);
    const [{ data: arts }, { data: tags }, { data: paths }, { data: days }, { data: research }] = await Promise.all([
      sb.from("articles").select("*").order("sort_order"), sb.from("article_archetypes").select("*"),
      sb.from("pathways").select("*").order("sort_order"), sb.from("pathway_days").select("*").order("day_number"), sb.from("research_articles").select("*").order("sort_order"),
    ]);
    const byArt = new Map<string, string[]>();
    for (const t of tags ?? []) byArt.set(t.article_id, [...(byArt.get(t.article_id) ?? []), t.archetype_slug]);
    const articles = (arts ?? []).map((a) => ({ ...a, archetypes: byArt.get(a.id) ?? [] }));
    await audit(sb, context.userId, "content.export", "library", null, { format: data.format, articles: articles.length });
    if (data.format === "json") return { filename: `content-library-${new Date().toISOString().slice(0, 10)}.json`, mime: "application/json", body: JSON.stringify({ exportedAt: new Date().toISOString(), articles, pathways: paths ?? [], pathway_days: days ?? [], research: research ?? [] }, null, 2) };
    const cols = ["slug", "title", "excerpt", "category", "read_minutes", "tags", "archetypes", "published", "tldr", "hero_image_url", "body"];
    const esc = (v: unknown) => `"${String(Array.isArray(v) ? v.join("|") : v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...articles.map((a) => cols.map((c) => esc((a as Record<string, unknown>)[c])).join(","))].join("\n");
    return { filename: `articles-${new Date().toISOString().slice(0, 10)}.csv`, mime: "text/csv", body: csv };
  });
