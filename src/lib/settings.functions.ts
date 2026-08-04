import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Keys/categories exposed publicly (no auth) via GET /api/settings */
export const PUBLIC_CATEGORIES = [
  "general",
  "seo",
  "social",
  "theme",
  "homepage",
  "footer",
  "blog",
  "announcement",
  "legal",
  "media",
  "interview",
  "book_generation",
] as const;

/** All known categories (admin panel tabs). */
export const ALL_CATEGORIES = [
  "general",
  "smtp",
  "seo",
  "social",
  "theme",
  "homepage",
  "footer",
  "blog",
  "announcement",
  "security",
  "media",
  "legal",
  "interview",
  "book_generation",
] as const;

/** Server-only: strip fields that must never leave the server. */
function redactPrivate(key: string, value: any): any {
  if (!value || typeof value !== "object") return value;
  const clone: Record<string, any> = { ...value };
  if (key === "security") {
    delete clone.recaptcha_secret;
    delete clone.turnstile_secret;
  }
  if (key === "seo") {
    // verification tokens are fine on public HTML meta tags — keep.
  }
  return clone;
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** Public: enabled settings for the whole site. No auth. */
export const getPublicSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("key", PUBLIC_CATEGORIES as unknown as string[]);
    if (error) throw new Error(error.message);
    const out: Record<string, any> = {};
    for (const row of data ?? []) {
      out[row.key] = redactPrivate(row.key, row.value);
    }
    return out;
  },
);

/** Admin: all categories (including secrets like SMTP password). */
export const getAllSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("key, value");
    if (error) throw new Error(error.message);
    const out: Record<string, any> = {};
    for (const row of data ?? []) out[row.key] = row.value;
    return out;
  });

const updateSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.record(z.string(), z.any()),
});

/** Admin: upsert one category. */
export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { key: data.key, value: data.value, updated_by: context.userId },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
