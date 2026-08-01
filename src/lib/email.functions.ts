import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** {{var}} interpolation. Missing vars render as empty string. */
function render(tpl: string, vars: Record<string, any>) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

async function loadPublicSettings(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", ["general", "smtp"]);
  const out: Record<string, any> = {};
  for (const r of data ?? []) out[r.key] = r.value ?? {};
  return out;
}

/** Core: send email using a stored template. */
export async function sendTemplatedEmail(opts: {
  templateKey: string;
  to: string;
  variables?: Record<string, any>;
  replyTo?: string;
}) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { sendLovableEmail } = await import("@lovable.dev/email-js");

  const { data: tpl, error: tplErr } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("key", opts.templateKey)
    .maybeSingle();
  if (tplErr) throw new Error(tplErr.message);
  if (!tpl) throw new Error(`Template not found: ${opts.templateKey}`);
  if (!tpl.enabled) throw new Error(`Template disabled: ${opts.templateKey}`);

  const settings = await loadPublicSettings(supabaseAdmin);
  const general = settings.general ?? {};
  const smtp = settings.smtp ?? {};

  const vars = {
    site_name: general.site_name ?? "My Family History Book",
    app_url: general.app_url ?? "",
    support_email: general.support_email ?? "",
    ...(opts.variables ?? {}),
  };

  const subject = render(tpl.subject, vars);
  const html = render(tpl.html_body, vars);
  const text = render(tpl.text_body ?? tpl.html_body.replace(/<[^>]+>/g, ""), vars);

  const from =
    smtp.from_email && smtp.from_name
      ? `${smtp.from_name} <${smtp.from_email}>`
      : smtp.from_email || general.support_email || "noreply@example.com";

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  let status = "sent";
  let error: string | null = null;

  try {
    await sendLovableEmail(
      {
        to: opts.to,
        from,
        subject,
        html,
        text,
        reply_to: opts.replyTo,
        purpose: opts.templateKey,
      },
      { apiKey },
    );
  } catch (e: any) {
    status = "failed";
    error = e?.message ?? String(e);
  }

  await supabaseAdmin.from("email_logs").insert({
    template_key: opts.templateKey,
    to_email: opts.to,
    subject,
    status,
    error,
    variables: opts.variables ?? {},
  });

  if (status === "failed") throw new Error(error!);
  return { ok: true };
}

/** Send a templated email to the configured admin address (support_email). Best-effort. */
export async function notifyAdmin(templateKey: string, variables: Record<string, any>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle();
    const to = (data?.value as any)?.support_email;
    if (!to) return { ok: false, reason: "no admin email configured" };
    await sendTemplatedEmail({ templateKey, to, variables });
    return { ok: true };
  } catch (e) {
    console.error(`[notifyAdmin ${templateKey}] failed:`, (e as Error).message);
    return { ok: false, reason: (e as Error).message };
  }
}

// ============ Admin server functions ============

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "lowercase, digits, underscore"),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  subject: z.string().min(1).max(300),
  html_body: z.string().min(1),
  text_body: z.string().optional().nullable(),
  variables: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("email_templates")
        .update(data)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("email_templates")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("email_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        templateKey: z.string().min(1),
        to: z.string().email(),
        variables: z.record(z.string(), z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return sendTemplatedEmail({
      templateKey: data.templateKey,
      to: data.to,
      variables: data.variables,
    });
  });

export const replyToMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        subject: z.string().min(1).max(300),
        message: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: msg, error } = await supabaseAdmin
      .from("contact_messages")
      .select("id, name, email")
      .eq("id", data.messageId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!msg) throw new Error("Message not found");

    await sendTemplatedEmail({
      templateKey: "contact_reply",
      to: msg.email,
      variables: {
        name: msg.name,
        subject: data.subject,
        message: data.message,
      },
    });

    await supabaseAdmin
      .from("contact_messages")
      .update({ read: true })
      .eq("id", data.messageId);

    return { ok: true };
  });

export const listEmailLogsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, count, error } = await supabaseAdmin
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });
