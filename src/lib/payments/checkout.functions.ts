import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decryptJson } from "./crypto.server";
import { getAdapter } from "./gateways/registry";
import type { GatewayCredentials } from "./gateways/types";

/** List enabled gateways for the user-facing checkout picker (safe fields only). */
export const listCheckoutGateways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_gateways")
      .select("id, slug, name, description, logo_url, currency, mode, payment_instructions, display_order")
      .eq("enabled", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Fetch a transaction owned by the current user (for success/cancel page). */
export const getMyTransaction = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("payment_transactions")
      .select("id, amount, currency, status, gateway_slug, description, external_id, created_at, metadata")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** Admin refund action: calls adapter.refund when available, always logs. */
export const refundTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { transactionId: string; reason?: string }) =>
    z.object({ transactionId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: tx, error } = await context.supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", data.transactionId)
      .maybeSingle();
    if (error || !tx) throw new Error("Transaction not found");
    if (tx.status !== "succeeded") throw new Error(`Cannot refund a ${tx.status} transaction`);

    const { data: gw } = tx.gateway_id
      ? await context.supabase
          .from("payment_gateways")
          .select("*")
          .eq("id", tx.gateway_id)
          .maybeSingle()
      : { data: null as any };

    const adapter = gw ? getAdapter(gw.slug) : null;
    let providerResult: { ok: boolean; externalId?: string; message?: string } = {
      ok: true,
      message: "manual",
    };

    if (adapter?.refund && gw && tx.external_id) {
      const creds = (decryptJson<GatewayCredentials>(gw.credentials_encrypted) ?? {}) as GatewayCredentials;
      try {
        providerResult = await adapter.refund({
          credentials: creds,
          mode: gw.mode,
          externalId: tx.external_id,
          amount: Number(tx.amount),
          currency: tx.currency,
          reason: data.reason,
        });
      } catch (e) {
        providerResult = { ok: false, message: (e as Error).message };
      }
    }

    await context.supabase.from("refund_logs").insert({
      transaction_id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      status: providerResult.ok ? "succeeded" : "failed",
      reason: data.reason ?? null,
      external_id: providerResult.externalId ?? null,
      meta: { adapter_message: providerResult.message ?? null },
    });

    if (providerResult.ok) {
      await context.supabase
        .from("payment_transactions")
        .update({ status: "refunded" })
        .eq("id", tx.id);
    }

    return { ok: providerResult.ok, message: providerResult.message };
  });
