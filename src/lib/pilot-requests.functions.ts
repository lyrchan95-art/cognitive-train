import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TEAM_SIZES = ["Under 20", "20–50", "51–100", "101–200", "Over 200"] as const;

const pilotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(1).max(160),
  teamSize: z.enum(TEAM_SIZES),
  message: z.string().trim().max(2000).optional(),
  /** Honeypot — real visitors never see or fill this field. */
  website: z.string().max(0).optional(),
});

export const submitPilotRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pilotSchema.parse(data))
  .handler(async ({ data }) => {
    // Public form, no session: insert with the admin client. RLS keeps the
    // table unreadable to everyone except admins.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pilot_requests").insert({
      name: data.name,
      email: data.email,
      company: data.company,
      team_size: data.teamSize,
      message: data.message || null,
    });
    if (error) throw new Error("Could not send your request. Please try again.");
    return { ok: true };
  });
