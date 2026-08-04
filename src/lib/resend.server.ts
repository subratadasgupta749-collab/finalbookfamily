import { decryptJson } from "@/lib/payments/crypto.server";

export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailSettingsRow {
  id: string;
  resend_enabled: boolean;
  resend_api_key_encrypted: string | null;
  sender_name: string;
  sender_email: string;
  reply_to_email: string | null;
  verified_domain: string | null;
  default_from_address: string;
  connection_status: string;
  last_tested_at: string | null;
  last_test_message: string | null;
  enable_transactional: boolean;
  enable_newsletter: boolean;
  enable_marketing: boolean;
  auto_retry: boolean;
  open_tracking: boolean;
  click_tracking: boolean;
  rate_limit_per_min: number;
}

/** Resolves Resend settings and decrypts API key server-side. */
export async function getResendSettings(): Promise<{ settings: EmailSettingsRow | null; apiKey: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("email_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const row = (data as EmailSettingsRow) ?? null;
  let apiKey = "";

  if (row?.resend_api_key_encrypted) {
    const decrypted = decryptJson<string>(row.resend_api_key_encrypted);
    if (decrypted && decrypted.trim().length > 0) {
      apiKey = decrypted.trim();
    }
  }

  if (!apiKey && process.env.RESEND_API_KEY) {
    apiKey = process.env.RESEND_API_KEY.trim();
  }

  return { settings: row, apiKey };
}

/** Core Resend API client via native fetch to https://api.resend.com/emails */
export async function sendResendEmail(opts: ResendEmailOptions): Promise<{ id: string }> {
  const { settings, apiKey } = await getResendSettings();

  if (settings && !settings.resend_enabled) {
    throw new Error("[Resend Disabled] Resend email delivery is currently disabled in Admin Panel.");
  }

  if (!apiKey) {
    throw new Error("[Resend Config Error] No Resend API Key found. Configure it in Admin Panel → Email Center → Resend Settings.");
  }

  const from =
    opts.from ||
    settings?.default_from_address ||
    (settings?.sender_name && settings?.sender_email
      ? `${settings.sender_name} <${settings.sender_email}>`
      : "My Family Book <noreply@myfamilybook.com>");

  const payload: Record<string, unknown> = {
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    reply_to: opts.replyTo || settings?.reply_to_email || undefined,
    tags: opts.tags,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedErr = errorText;
    try {
      const json = JSON.parse(errorText);
      parsedErr = json?.message || json?.error || errorText;
    } catch {}
    throw new Error(`[Resend API Error ${response.status}] ${parsedErr}`);
  }

  const result = (await response.json()) as { id: string };
  return result;
}

/** Tests Resend connection by calling Resend API or sending test ping. */
export async function testResendConnection(testRecipient?: string): Promise<{ ok: boolean; message: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { settings, apiKey } = await getResendSettings();

  if (!apiKey) {
    const msg = "No API Key configured. Please enter a valid Resend API Key starting with 're_'.";
    if (settings?.id) {
      await (supabaseAdmin as any)
        .from("email_settings")
        .update({ connection_status: "error", last_tested_at: new Date().toISOString(), last_test_message: msg })
        .eq("id", settings.id);
    }
    return { ok: false, message: msg };
  }

  const toEmail = testRecipient || settings?.sender_email || "test@example.com";
  const t0 = Date.now();

  try {
    const resendRes = await sendResendEmail({
      to: toEmail,
      subject: "Resend Connection Test — My Family Book",
      html: `
        <div font-family: sans-serif; padding: 20px;">
          <h2>✅ Resend Connection Successful!</h2>
          <p>This test email confirms that your Resend API Key is active and sending emails successfully.</p>
          <p><strong>Tested at:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: "Resend Connection Successful!",
    });

    const ms = Date.now() - t0;
    const msg = `Connection Active — Message ID: ${resendRes.id} (${ms}ms)`;

    if (settings?.id) {
      await (supabaseAdmin as any)
        .from("email_settings")
        .update({ connection_status: "ok", last_tested_at: new Date().toISOString(), last_test_message: msg })
        .eq("id", settings.id);
    }

    return { ok: true, message: msg };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (settings?.id) {
      await (supabaseAdmin as any)
        .from("email_settings")
        .update({ connection_status: "error", last_tested_at: new Date().toISOString(), last_test_message: msg })
        .eq("id", settings.id);
    }
    return { ok: false, message: msg };
  }
}
