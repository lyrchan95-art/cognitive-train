import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function serverPublic() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}

export const RESEARCH_CATEGORIES = [
  { slug: "neuroscience", label: "Neuroscience" },
  { slug: "behavioral_psychology", label: "Behavioral Psychology" },
  { slug: "editorial", label: "Editorial" },
  { slug: "research", label: "Research Paper" },
] as const;

export type ResearchArticle = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  authors: string | null;
  category: string;
  abstract: string;
  body: string;
  source_url: string | null;
  citation: string | null;
  hero_image_url: string | null;
  published_date: string;
  read_minutes: number;
  published?: boolean;
  sort_order?: number;
};

export const listResearch = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ category: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    let q = sb
      .from("research_articles")
      .select(
        "id, slug, title, subtitle, authors, category, abstract, hero_image_url, published_date, read_minutes",
      )
      .eq("published", true)
      .order("published_date", { ascending: false });
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getResearchBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: row, error } = await sb
      .from("research_articles")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row as ResearchArticle;
  });

/* -------- Admin -------- */

export const adminListResearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("research_articles")
      .select("id, slug, title, category, authors, published, published_date, read_minutes, updated_at")
      .order("published_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
  title: z.string().min(3).max(300),
  subtitle: z.string().max(300).optional().or(z.literal("")),
  authors: z.string().max(400).optional().or(z.literal("")),
  category: z.enum(["neuroscience", "behavioral_psychology", "editorial", "research"]),
  abstract: z.string().min(10).max(2000),
  body: z.string().min(10).max(50000),
  source_url: z.string().url().optional().or(z.literal("")),
  citation: z.string().max(1000).optional().or(z.literal("")),
  hero_image_url: z.string().url().optional().or(z.literal("")),
  published_date: z.string().min(4).max(20),
  read_minutes: z.number().int().min(1).max(120),
  published: z.boolean(),
});

export const adminUpsertResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload = {
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle || null,
      authors: data.authors || null,
      category: data.category,
      abstract: data.abstract,
      body: data.body,
      source_url: data.source_url || null,
      citation: data.citation || null,
      hero_image_url: data.hero_image_url || null,
      published_date: data.published_date,
      read_minutes: data.read_minutes,
      published: data.published,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("research_articles")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("research_articles")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("research_articles")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetResearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("research_articles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
