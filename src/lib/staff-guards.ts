// Client-safe helpers shared by staff-only server functions (no secrets here).
// Role checks go through the security-definer SQL helpers so RLS can never recurse.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Sb = SupabaseClient<Database>;

export type StaffRoles = {
  isAdmin: boolean;
  isLab: boolean;
  isEditor: boolean;
};

export async function getStaffRoles(sb: Sb, userId: string): Promise<StaffRoles> {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles = new Set((data ?? []).map((r) => r.role as string));
  const isAdmin = roles.has("admin");
  return {
    isAdmin,
    isLab: isAdmin || roles.has("data_scientist"),
    isEditor: isAdmin || roles.has("content_editor"),
  };
}

export async function assertLab(sb: Sb, userId: string) {
  const r = await getStaffRoles(sb, userId);
  if (!r.isLab) throw new Error("Forbidden: data_scientist or admin role required");
  return r;
}

export async function assertEditor(sb: Sb, userId: string) {
  const r = await getStaffRoles(sb, userId);
  if (!r.isEditor) throw new Error("Forbidden: content_editor or admin role required");
  return r;
}

export async function assertAdmin(sb: Sb, userId: string) {
  const r = await getStaffRoles(sb, userId);
  if (!r.isAdmin) throw new Error("Forbidden: admin role required");
  return r;
}

/** Append-only audit trail. Never throws — an audit failure must not roll back the action silently, so we log it. */
export async function audit(
  sb: Sb,
  actor: string,
  action: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown> = {},
) {
  const { error } = await sb.from("audit_log").insert({
    actor,
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload: payload as never,
  });
  if (error) console.error("[audit] failed to write", action, error.message);
}

/** Privacy guardrail: minimum cell size for any cohort shown to a human. */
export const DEFAULT_MIN_CELL = 10;
export const HARD_MIN_CELL = 5;

export function clampMinCell(n: number | undefined) {
  if (!n || Number.isNaN(n)) return DEFAULT_MIN_CELL;
  return Math.max(HARD_MIN_CELL, Math.floor(n));
}
