import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export type ArticleFeedItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string | null;
  tldr: string | null;
  hero_image_url: string | null;
  category: string;
  read_minutes: number;
  tags: string[];
  liked: boolean;
  like_count: number;
};

/** Public: list articles for a given archetype (or all). No auth required. */
export const listArticlesForArchetype = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ archetypeSlug: z.string().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    let ids: string[] | null = null;
    if (data.archetypeSlug) {
      const { data: tagRows, error: tagErr } = await sb
        .from("article_archetypes")
        .select("article_id")
        .eq("archetype_slug", data.archetypeSlug);
      if (tagErr) throw new Error(tagErr.message);
      ids = (tagRows ?? []).map((r) => r.article_id);
      if (!ids.length) return [] as ArticleFeedItem[];
    }
    let q = sb
      .from("articles")
      .select("id, slug, title, excerpt, body, tldr, hero_image_url, category, read_minutes, tags, sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (ids) q = q.in("id", ids);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      body: r.body,
      tldr: r.tldr,
      hero_image_url: r.hero_image_url,
      category: r.category,
      read_minutes: r.read_minutes,
      tags: r.tags,
      liked: false,
      like_count: 0,
    })) as ArticleFeedItem[];
  });

/** Authenticated: personalized feed with like state. */
export const getMyFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Look up user's archetype (may be null before quiz).
    const { data: mine } = await supabase
      .from("user_archetype")
      .select("archetype_slug")
      .eq("user_id", userId)
      .maybeSingle();

    let articleIds: string[] | null = null;
    if (mine?.archetype_slug) {
      const { data: tags } = await supabase
        .from("article_archetypes")
        .select("article_id")
        .eq("archetype_slug", mine.archetype_slug);
      articleIds = (tags ?? []).map((r) => r.article_id);
    }

    let q = supabase
      .from("articles")
      .select("id, slug, title, excerpt, body, tldr, hero_image_url, category, read_minutes, tags, sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (articleIds && articleIds.length) q = q.in("id", articleIds);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { data: likes } = await supabase
      .from("article_likes")
      .select("article_id")
      .eq("user_id", userId);
    const likedSet = new Set((likes ?? []).map((l) => l.article_id));

    return {
      archetypeSlug: mine?.archetype_slug ?? null,
      articles: (rows ?? []).map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        body: r.body,
        tldr: r.tldr,
        hero_image_url: r.hero_image_url,
        category: r.category,
        read_minutes: r.read_minutes,
        tags: r.tags,
        liked: likedSet.has(r.id),
        like_count: 0,
      })) as ArticleFeedItem[],
    };
  });

export const toggleArticleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ articleId: z.string().uuid(), liked: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.liked) {
      const { error } = await supabase
        .from("article_likes")
        .insert({ user_id: userId, article_id: data.articleId });
      if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("article_likes")
        .delete()
        .eq("user_id", userId)
        .eq("article_id", data.articleId);
      if (error) throw new Error(error.message);
    }
    return { liked: data.liked };
  });
