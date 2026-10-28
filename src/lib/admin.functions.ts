import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

/** Returns role flags + adminCount — used by admin gate + bootstrap CTA. */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: mine }, { count }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
    ]);
    const roles = new Set((mine ?? []).map((r) => r.role as string));
    const isAdmin = roles.has("admin");
    return {
      isAdmin,
      isLab: isAdmin || roles.has("data_scientist"),
      isEditor: isAdmin || roles.has("content_editor"),
      roles: [...roles],
      adminCount: count ?? 0,
    };
  });

/** Admin: list staff users and their roles (emails via Auth admin API, after admin check). */
export const adminListStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: roles, error } = await context.supabase.from("user_roles").select("user_id, role, created_at");
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const email = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as string]);
    return {
      staff: [...byUser.entries()].map(([user_id, rs]) => ({ user_id, email: email.get(user_id) ?? "(unknown)", roles: rs })),
      users: (users?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? "" })),
    };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: z.enum(["admin", "data_scientist", "content_editor", "moderator"]), grant: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.grant && data.role === "admin" && data.userId === context.userId) throw new Error("You cannot remove your own admin role");
    const { error } = data.grant
      ? await context.supabase.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role", ignoreDuplicates: true })
      : await context.supabase.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({ actor: context.userId, action: data.grant ? "role.grant" : "role.revoke", entity_type: "user_roles", entity_id: data.userId, payload: { role: data.role } });
    return { ok: true };
  });

/** One-time: signed-in user promotes themselves iff no admin exists yet. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw new Error(error.message);
    return { claimed: !!data };
  });

/** Admin: list every archetype (published + unpublished). */
export const adminListArchetypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("archetypes")
      .select("slug, name, icon, tagline, headline, accent, sort_order, published")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminToggleArchetypePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string(), published: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("archetypes")
      .update({ published: data.published })
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list every article with tag counts. */
export const adminListArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: articles, error } = await context.supabase
      .from("articles")
      .select("id, slug, title, excerpt, category, read_minutes, tags, published, sort_order, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: joins } = await context.supabase
      .from("article_archetypes")
      .select("article_id, archetype_slug");
    const byArticle = new Map<string, string[]>();
    (joins ?? []).forEach((j) => {
      const arr = byArticle.get(j.article_id) ?? [];
      arr.push(j.archetype_slug);
      byArticle.set(j.article_id, arr);
    });
    return (articles ?? []).map((a) => ({
      ...a,
      archetype_slugs: byArticle.get(a.id) ?? [],
    }));
  });

export const adminToggleArticlePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("articles")
      .update({ published: data.published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(300),
      excerpt: z.string().max(600),
      category: z.string().max(80),
      read_minutes: z.number().int().min(1).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("articles")
      .update({
        title: data.title,
        excerpt: data.excerpt,
        category: data.category,
        read_minutes: data.read_minutes,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ================= PATHWAYS (Admin) ================= */

export const adminListPathways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pathways")
      .select("id, slug, title, description, archetype_slug, icon, difficulty, duration_days, hero_image_url, sort_order, published, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetPathwayDays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pathwayId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("pathway_days")
      .select("id, pathway_id, day_number, title, content, action_prompt, read_minutes")
      .eq("pathway_id", data.pathwayId)
      .order("day_number", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdatePathway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(300),
      description: z.string().max(2000),
      icon: z.string().max(8).optional(),
      difficulty: z.string().max(40),
      hero_image_url: z.string().url().optional().or(z.literal("")),
      published: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pathways")
      .update({
        title: data.title,
        description: data.description,
        icon: data.icon ?? "📘",
        difficulty: data.difficulty,
        hero_image_url: data.hero_image_url || null,
        published: data.published,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdatePathwayDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(300),
      content: z.string().min(3).max(5000),
      action_prompt: z.string().min(3).max(1000),
      read_minutes: z.number().int().min(1).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pathway_days")
      .update({
        title: data.title,
        content: data.content,
        action_prompt: data.action_prompt,
        read_minutes: data.read_minutes,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin-only test tool: switch the signed-in admin's own archetype so they can
 * preview the personalised experience of any archetype. Uses the archetype's
 * target signature as the dimension scores and clears today's briefing so a
 * fresh one is generated for the new archetype.
 */
export const adminPreviewArchetype = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { archetypeSignature } = await import("./quiz");
    const dims = archetypeSignature(data.slug);
    if (!dims) throw new Error("Unknown archetype");

    const { error } = await context.supabase.from("user_archetype").upsert(
      {
        user_id: context.userId,
        archetype_slug: data.slug,
        confidence: 1,
        dimension_scores: dims,
        responses: {},
        taken_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    await context.supabase
      .from("daily_briefings")
      .delete()
      .eq("user_id", context.userId)
      .eq("briefing_date", today);

    return { slug: data.slug };
  });
