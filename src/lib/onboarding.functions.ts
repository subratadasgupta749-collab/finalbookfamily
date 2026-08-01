import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTemplatedEmail } from "./email.functions";

/**
 * Called from the client after signup succeeds. The user is already
 * authenticated at this point, so this runs under RLS as that user.
 */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.email) return { ok: false, reason: "no email" };
    try {
      await sendTemplatedEmail({
        templateKey: "welcome",
        to: profile.email,
        variables: {
          customer_name: profile.full_name ?? "there",
        },
      });
      return { ok: true };
    } catch (e) {
      // Email failures must not break signup UX.
      return { ok: false, reason: (e as Error).message };
    }
  });
