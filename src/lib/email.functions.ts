import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptJson } from "@/lib/payments/crypto.server";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** {{var}} interpolation. Missing vars render as empty string. */
function renderTemplate(tpl: string, vars: Record<string, any>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: "Welcome to {{site_name}}, {{user_name}}!",
    html: "<h1>Welcome, {{user_name}}!</h1><p>We are thrilled to have you at {{site_name}}.</p>",
  },
  verification: {
    subject: "Verify your email address for {{site_name}}",
    html: "<p>Hi {{user_name}}, click here to verify: <a href='{{verify_link}}'>Verify Email</a></p>",
  },
  otp: {
    subject: "Your Security Code: {{otp_code}}",
    html: "<h2>Your Security Code is {{otp_code}}</h2><p>This code expires in 10 minutes.</p>",
  },
  password_reset: {
    subject: "Reset your {{site_name}} password",
    html: "<p>Hi {{user_name}}, reset password: <a href='{{reset_link}}'>Reset Password</a></p>",
  },
  book_generation_started: {
    subject: "Your book \"{{book_title}}\" is being written!",
    html: "<p>Hi {{user_name}}, our AI is crafting your family story: {{book_title}}.</p>",
  },
  book_ready: {
    subject: "Your book \"{{book_title}}\" is ready!",
    html: "<h2>Congratulations {{user_name}}!</h2><p>Your book <strong>{{book_title}}</strong> is complete.</p>",
  },
  payment_success: {
    subject: "Payment Receipt for {{site_name}}",
    html: "<p>Hi {{user_name}}, thank you for your payment of {{amount}}.</p>",
  },
  support_reply: {
    subject: "Re: {{ticket_subject}}",
    html: "<p>Hi {{user_name}},</p><div>{{reply_message}}</div>",
  },
};

/* ====================================================================
   CORE TRANSACTIONAL EMAIL DISPATCHER (RESEND POWERED)
   ==================================================================== */

export async function sendTemplatedEmail(opts: {
  templateKey: string;
  to: string;
  variables?: Record<string, any>;
  replyTo?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendResendEmail } = await import("./resend.server");

  let tpl: any = null;

  try {
    const { data } = await (supabaseAdmin as any)
      .from("email_templates")
      .select("*")
      .eq("key", opts.templateKey)
      .maybeSingle();
    if (data) tpl = data;
  } catch {}

  if (!tpl) {
    const fallback = DEFAULT_TEMPLATES[opts.templateKey];
    if (fallback) {
      tpl = { key: opts.templateKey, subject: fallback.subject, html_body: fallback.html, enabled: true };
    }
  }

  if (!tpl) throw new Error(`Template not found: ${opts.templateKey}`);
  if (tpl.enabled === false) throw new Error(`Template disabled: ${opts.templateKey}`);

  let general: Record<string, any> = {};
  try {
    const { data: appSet } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("key,value")
      .in("key", ["general"]);
    general = (appSet?.[0]?.value as any) ?? {};
  } catch {}

  const vars = {
    site_name: general.site_name ?? "My Family History Book",
    app_url: general.app_url ?? "",
    support_email: general.support_email ?? "support@myfamilybook.com",
    ...(opts.variables ?? {}),
  };

  const subject = renderTemplate(tpl.subject, vars);
  const html = renderTemplate(tpl.html_body, vars);
  const text = tpl.text_body ? renderTemplate(tpl.text_body, vars) : html.replace(/<[^>]+>/g, "");

  let status = "sent";
  let errorMsg: string | null = null;
  let resendId: string | null = null;

  try {
    const result = await sendResendEmail({
      to: opts.to,
      subject,
      html,
      text,
      replyTo: opts.replyTo,
      tags: [{ name: "template_key", value: opts.templateKey }],
    });
    resendId = result.id;
  } catch (e: any) {
    status = "failed";
    errorMsg = e?.message ?? String(e);
  }

  // Log execution safely
  try {
    await (supabaseAdmin as any).from("email_logs").insert({
      template_key: opts.templateKey,
      to_email: opts.to,
      subject,
      status,
      resend_id: resendId,
      error_message: errorMsg,
      variables: opts.variables ?? {},
    });
  } catch {}

  if (status === "failed") throw new Error(errorMsg!);
  return { ok: true, resendId };
}

/** Admin notification wrapper */
export async function notifyAdmin(templateKey: string, variables: Record<string, any>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let to = "support@myfamilybook.com";
    try {
      const { data } = await (supabaseAdmin as any)
        .from("app_settings")
        .select("value")
        .eq("key", "general")
        .maybeSingle();
      if ((data?.value as any)?.support_email) {
        to = (data?.value as any)?.support_email;
      }
    } catch {}

    return await sendTemplatedEmail({ templateKey, to, variables });
  } catch (e: any) {
    console.error(`[notifyAdmin ${templateKey}] failed:`, e?.message);
    return { ok: false, reason: e?.message };
  }
}

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: msg, error } = await (supabaseAdmin as any)
      .from("contact_messages")
      .select("id, name, email")
      .eq("id", data.messageId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!msg) throw new Error("Message not found");

    await sendTemplatedEmail({
      templateKey: "support_reply",
      to: msg.email,
      variables: {
        user_name: msg.name || "Customer",
        ticket_subject: data.subject,
        reply_message: data.message,
      },
    });

    try {
      await (supabaseAdmin as any)
        .from("contact_messages")
        .update({ read: true })
        .eq("id", data.messageId);
    } catch {}

    return { ok: true };
  });

/* ====================================================================
   ADMIN API — RESEND SETTINGS
   ==================================================================== */

export const getEmailSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let data: any = null;

    try {
      const { data: tData, error } = await (supabaseAdmin as any)
        .from("email_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!error && tData) data = tData;
    } catch {}

    if (!data) {
      try {
        const { data: aData } = await (supabaseAdmin as any)
          .from("app_settings")
          .select("value")
          .eq("key", "email_settings")
          .maybeSingle();
        if (aData?.value) data = aData.value;
      } catch {}
    }

    if (!data) {
      data = {
        resend_enabled: true,
        sender_name: "My Family Book",
        sender_email: "noreply@myfamilybook.com",
        reply_to_email: "support@myfamilybook.com",
        verified_domain: "myfamilybook.com",
        default_from_address: "My Family Book <noreply@myfamilybook.com>",
        enable_transactional: true,
        enable_newsletter: true,
        enable_marketing: true,
        auto_retry: true,
        open_tracking: true,
        click_tracking: true,
        rate_limit_per_min: 600,
      };
    }

    return {
      ...data,
      resend_api_key_encrypted: undefined,
      has_api_key: !!(data.resend_api_key_encrypted || process.env.RESEND_API_KEY),
      api_key_preview: data.resend_api_key_encrypted ? "re_••••••••" : process.env.RESEND_API_KEY ? "Env Key (active)" : null,
    };
  });

const settingsPatchSchema = z.object({
  resend_enabled: z.boolean().optional(),
  api_key: z.string().optional().nullable(),
  sender_name: z.string().min(1).max(100).optional(),
  sender_email: z.string().email().optional(),
  reply_to_email: z.string().email().optional().nullable(),
  verified_domain: z.string().optional().nullable(),
  default_from_address: z.string().optional(),
  enable_transactional: z.boolean().optional(),
  enable_newsletter: z.boolean().optional(),
  enable_marketing: z.boolean().optional(),
  auto_retry: z.boolean().optional(),
  open_tracking: z.boolean().optional(),
  click_tracking: z.boolean().optional(),
  rate_limit_per_min: z.number().int().min(10).max(10000).optional(),
});

export const updateEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsPatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { api_key, ...rest } = data;

    const patch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    if (api_key !== undefined) {
      const clean = api_key?.trim();
      patch.resend_api_key_encrypted = clean ? encryptJson(clean) : null;
    }

    let savedInTable = false;
    try {
      const { data: existing, error: findErr } = await (supabaseAdmin as any)
        .from("email_settings")
        .select("id, resend_api_key_encrypted")
        .limit(1)
        .maybeSingle();

      if (!findErr) {
        if (!patch.resend_api_key_encrypted && existing?.resend_api_key_encrypted) {
          patch.resend_api_key_encrypted = existing.resend_api_key_encrypted;
        }
        if (existing) {
          const { error: upErr } = await (supabaseAdmin as any)
            .from("email_settings")
            .update(patch)
            .eq("id", existing.id);
          if (!upErr) savedInTable = true;
        } else {
          const { error: insErr } = await (supabaseAdmin as any)
            .from("email_settings")
            .insert([patch]);
          if (!insErr) savedInTable = true;
        }
      }
    } catch {}

    // Always mirror to app_settings key "email_settings" as fallback
    try {
      const { data: appRow } = await (supabaseAdmin as any)
        .from("app_settings")
        .select("value")
        .eq("key", "email_settings")
        .maybeSingle();

      const existingVal = (appRow?.value as any) ?? {};
      const merged = {
        ...existingVal,
        ...patch,
        resend_api_key_encrypted: patch.resend_api_key_encrypted || existingVal.resend_api_key_encrypted || null,
      };

      await (supabaseAdmin as any)
        .from("app_settings")
        .upsert({ key: "email_settings", value: merged }, { onConflict: "key" });
    } catch (e: any) {
      if (!savedInTable) throw new Error(e?.message ?? "Failed to save settings");
    }

    return { ok: true };
  });

export const testResendConnectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { recipient?: string }) => z.object({ recipient: z.string().email().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { testResendConnection } = await import("./resend.server");
    return testResendConnection(data.recipient);
  });

/* ====================================================================
   ADMIN API — EMAIL TEMPLATES
   ==================================================================== */

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data, error } = await (supabaseAdmin as any).from("email_templates").select("*").order("name");
      if (!error && data) return data;
    } catch {}

    // Fallback to in-memory templates
    return Object.entries(DEFAULT_TEMPLATES).map(([key, t]) => ({
      id: key,
      key,
      name: key.replace(/_/g, " ").toUpperCase(),
      category: "transactional",
      subject: t.subject,
      html_body: t.html,
      variables: ["user_name", "app_url"],
      enabled: true,
    }));
  });

const saveTplSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["transactional", "marketing", "newsletter", "system"]).default("transactional"),
  subject: z.string().min(1).max(300),
  html_body: z.string().min(1),
  text_body: z.string().optional().nullable(),
  variables: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveTplSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = { ...data, updated_at: new Date().toISOString() };

    try {
      if (data.id && data.id.includes("-")) {
        const { error } = await (supabaseAdmin as any).from("email_templates").update(patch as any).eq("id", data.id);
        if (!error) return { ok: true, id: data.id };
      }
      const { data: row, error } = await (supabaseAdmin as any).from("email_templates").insert(patch as any).select("id").single();
      if (!error && row) return { ok: true, id: row.id };
    } catch {}

    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await (supabaseAdmin as any).from("email_templates").delete().eq("id", data.id);
    } catch {}
    return { ok: true };
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      templateKey: z.string().min(1),
      to: z.string().email(),
      variables: z.record(z.string(), z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return sendTemplatedEmail({
      templateKey: data.templateKey,
      to: data.to,
      variables: data.variables,
    });
  });

/* ====================================================================
   NEWSLETTER & CONTACT MANAGEMENT
   ==================================================================== */

export const subscribeNewsletterFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      segment: z.string().optional().default("Newsletter Subscribers"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await (supabaseAdmin as any).from("newsletter_subscribers").upsert(
        {
          email: data.email.toLowerCase().trim(),
          name: data.name ?? null,
          status: "subscribed",
          segment: data.segment,
        },
        { onConflict: "email" },
      );
    } catch {}
    return { ok: true };
  });

export const unsubscribeNewsletterFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .update({ status: "unsubscribed" })
        .eq("email", data.email.toLowerCase().trim());
    } catch {}
    return { ok: true };
  });

export const listSubscribersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    } catch {}
    return [];
  });

export const upsertSubscriberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().optional(),
      email: z.string().email(),
      name: z.string().nullable().optional(),
      status: z.enum(["subscribed", "unsubscribed"]).default("subscribed"),
      segment: z.string().default("Newsletter Subscribers"),
      tags: z.array(z.string()).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    try {
      if (id && id.includes("-")) {
        await (supabaseAdmin as any).from("newsletter_subscribers").update(rest).eq("id", id);
      } else {
        await (supabaseAdmin as any).from("newsletter_subscribers").upsert(rest, { onConflict: "email" });
      }
    } catch {}
    return { ok: true };
  });

export const deleteSubscriberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await (supabaseAdmin as any).from("newsletter_subscribers").delete().eq("id", data.id);
    } catch {}
    return { ok: true };
  });

/* ====================================================================
   CAMPAIGNS MANAGEMENT & EXECUTION
   ==================================================================== */

export const listCampaignsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    } catch {}
    return [];
  });

const campaignSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(150),
  subject: z.string().min(1).max(300),
  content_html: z.string().min(1),
  template_key: z.string().optional().nullable(),
  segment: z.string().default("All Users"),
  status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]).default("draft"),
  scheduled_at: z.string().optional().nullable(),
});

export const saveCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = { ...data, updated_at: new Date().toISOString() };

    try {
      if (data.id && data.id.includes("-")) {
        const { error } = await (supabaseAdmin as any).from("newsletter_campaigns").update(patch as any).eq("id", data.id);
        if (!error) return { ok: true, id: data.id };
      }
      const { data: row, error } = await (supabaseAdmin as any).from("newsletter_campaigns").insert(patch as any).select("id").single();
      if (!error && row) return { ok: true, id: row.id };
    } catch {}

    return { ok: true };
  });

export const sendCampaignNowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendResendEmail } = await import("./resend.server");

    let campaign: any = null;
    try {
      const { data: cData } = await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .select("*")
        .eq("id", data.campaignId)
        .single();
      if (cData) campaign = cData;
    } catch {}

    if (!campaign) throw new Error("Campaign not found");

    let recipients: any[] = [];
    try {
      let query = (supabaseAdmin as any).from("newsletter_subscribers").select("email, name").eq("status", "subscribed");
      if (campaign.segment !== "All Users" && campaign.segment !== "Newsletter Subscribers") {
        query = query.eq("segment", campaign.segment);
      }
      const { data: subs } = await query;
      if (subs) recipients = subs;
    } catch {}

    if (recipients.length === 0) {
      throw new Error("No active subscribers found for the selected segment.");
    }

    try {
      await (supabaseAdmin as any).from("newsletter_campaigns").update({ status: "sending" }).eq("id", campaign.id);
    } catch {}

    let sentCount = 0;
    for (const sub of recipients) {
      try {
        const html = renderTemplate(campaign.content_html, { user_name: sub.name || "Subscriber" });
        await sendResendEmail({
          to: sub.email,
          subject: campaign.subject,
          html,
          tags: [{ name: "campaign_id", value: campaign.id }],
        });
        sentCount++;
      } catch (e: any) {
        console.error(`[Campaign Send] Failed for ${sub.email}:`, e?.message);
      }
    }

    try {
      await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          stats_sent: sentCount,
        })
        .eq("id", campaign.id);
    } catch {}

    return { ok: true, sentCount };
  });

export const deleteCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      await (supabaseAdmin as any).from("newsletter_campaigns").delete().eq("id", data.id);
    } catch {}
    return { ok: true };
  });

/* ====================================================================
   LOGS, QUEUE & ANALYTICS
   ==================================================================== */

export const listEmailLogsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
      status: z.string().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    try {
      let query = (supabaseAdmin as any).from("email_logs").select("*", { count: "exact" });
      if (data.status) query = query.eq("status", data.status);

      const { data: rows, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
      if (!error && rows) return { rows, total: count ?? 0 };
    } catch {}

    return { rows: [], total: 0 };
  });

export const getEmailAnalyticsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let logs: any[] = [];
    let subs: any[] = [];

    try {
      const [logsRes, subRes] = await Promise.all([
        (supabaseAdmin as any).from("email_logs").select("status"),
        (supabaseAdmin as any).from("newsletter_subscribers").select("status"),
      ]);
      logs = logsRes.data ?? [];
      subs = subRes.data ?? [];
    } catch {}

    let totalSent = 0;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let failed = 0;
    let bounced = 0;

    for (const l of logs) {
      totalSent++;
      if (l.status === "delivered" || l.status === "sent") delivered++;
      if (l.status === "opened") { delivered++; opened++; }
      if (l.status === "clicked") { delivered++; opened++; clicked++; }
      if (l.status === "failed") failed++;
      if (l.status === "bounced") bounced++;
    }

    const activeSubscribers = subs.filter((s: any) => s.status === "subscribed").length;
    const unsubscribes = subs.filter((s: any) => s.status === "unsubscribed").length;

    return {
      totalSent,
      delivered,
      opened,
      clicked,
      failed,
      bounced,
      activeSubscribers,
      unsubscribes,
      openRate: totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0,
      bounceRate: totalSent > 0 ? Math.round((bounced / totalSent) * 100) : 0,
    };
  });
