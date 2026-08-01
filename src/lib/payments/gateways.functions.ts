import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptJson, decryptJson, maskSecret } from "./crypto.server";
import { getAdapter, listAdapters } from "./gateways/registry";
import type { GatewayCredentials } from "./gateways/types";

const modeEnum = z.enum(["sandbox", "live"]);

/** Public-facing gateway shape returned to admin UI — credentials are masked previews only. */
export type AdminGateway = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  enabled: boolean;
  mode: "sandbox" | "live";
  currency: string;
  country_restriction: string[];
  success_url: string | null;
  cancel_url: string | null;
  payment_instructions: string | null;
  display_order: number;
  status: string;
  webhook_verified: boolean;
  last_webhook_at: string | null;
  updated_at: string;
  webhook_url: string;
  has_webhook_secret: boolean;
  credentials_masked: Partial<Record<string, string>>;
  required_fields: string[];
  optional_fields: string[];
  supports_hosted_checkout: boolean;
};

function buildWebhookUrl(slug: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/public/webhooks/${slug}`;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const listGateways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { origin: string }) =>
    z.object({ origin: z.string().url() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<AdminGateway[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("payment_gateways")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r: any) => {
      const adapter = getAdapter(r.slug);
      const creds = (decryptJson<GatewayCredentials>(r.credentials_encrypted) ?? {}) as GatewayCredentials;
      const masked: Record<string, string> = {};
      for (const [k, v] of Object.entries(creds)) {
        const m = maskSecret(v as string);
        if (m) masked[k] = m;
      }
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        logo_url: r.logo_url,
        enabled: r.enabled,
        mode: r.mode,
        currency: r.currency,
        country_restriction: r.country_restriction ?? [],
        success_url: r.success_url,
        cancel_url: r.cancel_url,
        payment_instructions: r.payment_instructions,
        display_order: r.display_order,
        status: r.status,
        webhook_verified: r.webhook_verified,
        last_webhook_at: r.last_webhook_at,
        updated_at: r.updated_at,
        webhook_url: buildWebhookUrl(r.slug, data.origin),
        has_webhook_secret: !!r.webhook_secret_encrypted,
        credentials_masked: masked,
        required_fields: adapter?.requiredFields ?? [],
        optional_fields: adapter?.optionalFields ?? [],
        supports_hosted_checkout: !!adapter && adapter.slug === "lemonsqueezy",
      };
    });
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9_-]+$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  logo_url: z.string().url().max(500).optional().nullable().or(z.literal("")),
  enabled: z.boolean().optional(),
  mode: modeEnum.optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  country_restriction: z.array(z.string().trim().max(10)).optional(),
  success_url: z.string().url().optional().nullable().or(z.literal("")),
  cancel_url: z.string().url().optional().nullable().or(z.literal("")),
  payment_instructions: z.string().trim().max(4000).optional().nullable(),
  display_order: z.number().int().optional(),
  status: z.string().trim().max(30).optional(),
  credentials: z
    .object({
      api_key: z.string().optional(),
      secret_key: z.string().optional(),
      client_id: z.string().optional(),
      client_secret: z.string().optional(),
      merchant_email: z.string().optional(),
      store_id: z.string().optional(),
    })
    .partial()
    .optional(),
  webhook_secret: z.string().optional(),
});

export const upsertGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof upsertSchema>) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    // Merge credentials: keep existing values for any blank incoming field.
    let credentials_encrypted: string | null | undefined = undefined;
    if (data.credentials !== undefined) {
      let existing: GatewayCredentials = {};
      if (data.id) {
        const { data: row } = await context.supabase
          .from("payment_gateways")
          .select("credentials_encrypted")
          .eq("id", data.id)
          .maybeSingle();
        existing = (decryptJson<GatewayCredentials>(row?.credentials_encrypted) ?? {}) as GatewayCredentials;
      }
      const merged: GatewayCredentials = { ...existing };
      for (const [k, v] of Object.entries(data.credentials)) {
        if (v && v.trim().length > 0) (merged as any)[k] = v.trim();
      }
      credentials_encrypted = encryptJson(merged);
    }

    let webhook_secret_encrypted: string | null | undefined = undefined;
    if (data.webhook_secret !== undefined) {
      webhook_secret_encrypted =
        data.webhook_secret.trim().length > 0 ? encryptJson(data.webhook_secret.trim()) : null;
    }

    const payload: Record<string, unknown> = {
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      logo_url: data.logo_url || null,
      enabled: data.enabled ?? false,
      mode: data.mode ?? "sandbox",
      currency: data.currency ?? "USD",
      country_restriction: data.country_restriction ?? [],
      success_url: data.success_url || null,
      cancel_url: data.cancel_url || null,
      payment_instructions: data.payment_instructions ?? null,
      display_order: data.display_order ?? 0,
      status: data.status ?? "active",
    };
    if (credentials_encrypted !== undefined) payload.credentials_encrypted = credentials_encrypted;
    if (webhook_secret_encrypted !== undefined)
      payload.webhook_secret_encrypted = webhook_secret_encrypted;

    if (data.id) {
      const { error } = await context.supabase
        .from("payment_gateways")
        .update(payload as any)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await context.supabase
      .from("payment_gateways")
      .insert(payload as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const toggleGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; enabled: boolean }) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("payment_gateways")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("payment_gateways").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("payment_gateways")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Gateway not found");
    const adapter = getAdapter(row.slug);
    if (!adapter) return { ok: false, message: "No adapter registered for this gateway" };
    const creds = (decryptJson<GatewayCredentials>(row.credentials_encrypted) ?? {}) as GatewayCredentials;
    const res = await adapter.testConnection({ credentials: creds, mode: row.mode });
    return res;
  });

export const listWebhookLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { gatewayId?: string; limit?: number }) =>
    z
      .object({ gatewayId: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("webhook_logs")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.gatewayId) q = q.eq("gateway_id", data.gatewayId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; status?: string; gatewayId?: string; limit?: number }) =>
    z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        gatewayId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("payment_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.gatewayId) q = q.eq("gateway_id", data.gatewayId);
    if (data.search) q = q.or(`external_id.ilike.%${data.search}%,description.ilike.%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const retryWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: log, error } = await context.supabase
      .from("webhook_logs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !log) throw new Error("Webhook log not found");
    const { error: upErr } = await context.supabase
      .from("webhook_logs")
      .update({ processed: true, error: null })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

/**
 * Public checkout initiator (per-user). Backend picks the gateway when only one
 * is enabled; otherwise returns the list so the UI can show a selection popup.
 */
export const listEnabledGatewaysForCheckout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("payment_gateways")
      .select("id, slug, name, logo_url, currency, payment_instructions, mode, display_order")
      .eq("enabled", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const initiateCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      gatewayId?: string;
      amount: number;
      currency?: string;
      description?: string;
      customerEmail?: string;
      origin: string;
      metadata?: Record<string, unknown>;
      couponCode?: string;
    }) =>
      z
        .object({
          gatewayId: z.string().uuid().optional(),
          amount: z.number().positive().max(1_000_000),
          currency: z.string().min(1).max(10).optional(),
          description: z.string().max(500).optional(),
          customerEmail: z.string().email().optional(),
          origin: z.string().url(),
          metadata: z.record(z.string(), z.any()).optional(),
          couponCode: z.string().min(1).max(64).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Pick the gateway
    let q = context.supabase.from("payment_gateways").select("*").eq("enabled", true);
    if (data.gatewayId) q = q.eq("id", data.gatewayId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("No payment gateways available");
    const row = rows[0] as any;

    const adapter = getAdapter(row.slug);
    if (!adapter) throw new Error(`No adapter for gateway ${row.slug}`);

    const creds = (decryptJson<GatewayCredentials>(row.credentials_encrypted) ?? {}) as GatewayCredentials;
    const successUrl = row.success_url || `${data.origin}/dashboard?payment=success`;
    const cancelUrl = row.cancel_url || `${data.origin}/dashboard?payment=cancel`;

    // Optional coupon
    let couponCode: string | null = null;
    let discountAmount = 0;
    let finalAmount = data.amount;
    if (data.couponCode) {
      const { loadValidCoupon, computeDiscount } = await import("@/lib/coupons.functions");
      const res = await loadValidCoupon(context.supabase, data.couponCode);
      if (!res.ok) throw new Error(res.reason);
      discountAmount = computeDiscount(res.coupon, data.amount);
      finalAmount = Math.max(0, +(data.amount - discountAmount).toFixed(2));
      couponCode = res.coupon.code;
    }

    // Record pending transaction
    const { data: tx, error: txErr } = await context.supabase
      .from("payment_transactions")
      .insert({
        user_id: context.userId,
        gateway_id: row.id,
        gateway_slug: row.slug,
        amount: finalAmount,
        currency: data.currency ?? row.currency,
        status: "pending",
        description: data.description,
        metadata: { ...(data.metadata ?? {}), original_amount: data.amount },
        coupon_code: couponCode,
        discount_amount: discountAmount,
      })
      .select()
      .single();
    if (txErr) throw new Error(txErr.message);

    try {
      const result = await adapter.createCheckout({
        credentials: creds,
        mode: row.mode,
        input: {
          amount: finalAmount,
          currency: data.currency ?? row.currency,
          description: data.description,
          customerEmail: data.customerEmail,
          successUrl,
          cancelUrl,
          metadata: { ...(data.metadata ?? {}), tx_id: tx.id },
        },
        settings: { successUrl, cancelUrl, instructions: row.payment_instructions },
      });

      await context.supabase
        .from("payment_transactions")
        .update({ external_id: result.externalId ?? null, status: "processing" })
        .eq("id", tx.id);
      await context.supabase.from("payment_logs").insert({
        transaction_id: tx.id,
        gateway_slug: row.slug,
        level: "info",
        message: "Checkout created",
        meta: { redirectUrl: result.redirectUrl, externalId: result.externalId },
      });
      return {
        transactionId: tx.id,
        redirectUrl: result.redirectUrl,
        instructions: result.instructions ?? null,
        gateway: { id: row.id, slug: row.slug, name: row.name },
      };
    } catch (e) {
      await context.supabase.from("payment_transactions").update({ status: "failed" }).eq("id", tx.id);
      await context.supabase.from("payment_logs").insert({
        transaction_id: tx.id,
        gateway_slug: row.slug,
        level: "error",
        message: (e as Error).message,
      });
      throw e;
    }
  });

/** Introspection: what gateway slugs are known to the code (for admin "Add gateway" pickers). */
export const listRegisteredAdapters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return listAdapters().map((a) => ({
      slug: a.slug,
      name: a.name,
      requiredFields: a.requiredFields,
      optionalFields: a.optionalFields ?? [],
    }));
  });
