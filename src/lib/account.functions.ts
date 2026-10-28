import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // The user id comes from the verified token, and every query filters on it,
    // so the admin client only ever reads this user's own rows. Keep this list in
    // step with every table that holds personal data.
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const queries = {
      profiles: sb.from("profiles").select("*").eq("id", uid),
      user_archetype: sb.from("user_archetype").select("*").eq("user_id", uid),
      workplace_audits: sb.from("workplace_audits").select("*").eq("user_id", uid),
      daily_checkins: sb.from("daily_checkins").select("*").eq("user_id", uid),
      daily_briefings: sb.from("daily_briefings").select("*").eq("user_id", uid),
      user_streaks: sb.from("user_streaks").select("*").eq("user_id", uid),
      pathway_progress: sb.from("pathway_progress").select("*").eq("user_id", uid),
      article_likes: sb.from("article_likes").select("*").eq("user_id", uid),
      user_roles: sb.from("user_roles").select("*").eq("user_id", uid),
    };
    const tables: Record<string, unknown> = {};
    for (const [name, query] of Object.entries(queries)) {
      const { data, error } = await query;
      if (error) throw new Error(`Could not export ${name}.`);
      tables[name] = data ?? [];
    }
    const { data: auth } = await sb.auth.admin.getUserById(uid);
    const account = auth.user
      ? {
          id: auth.user.id,
          email: auth.user.email,
          created_at: auth.user.created_at,
          metadata: auth.user.user_metadata,
        }
      : { id: uid };
    // Returned as a ready-to-save JSON document.
    return JSON.stringify({ exported_at: new Date().toISOString(), account, tables }, null, 2);
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(data))
  .handler(async ({ context }) => {
    // Every user table references auth.users with ON DELETE CASCADE, so deleting
    // the auth user removes all of their rows.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Could not delete your account. Please try again or contact us.");
    return { ok: true };
  });
