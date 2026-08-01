import { createFileRoute } from "@tanstack/react-router";
import { getAdapter } from "@/lib/payments/gateways/registry";
import { decryptJson } from "@/lib/payments/crypto.server";

/**
 * Universal webhook receiver: /api/public/webhooks/:gateway
 * The slug is used to look up the DB row + adapter. Signature verification is
 * delegated to the adapter. Every delivery is logged; verified + parsed events
 * update the linked payment_transaction status.
 */
export const Route = createFileRoute("/api/public/webhooks/$gateway")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const slug = params.gateway;
        const rawBody = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((v, k) => {
          headers[k] = v;
        });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: gateway } = await supabaseAdmin
          .from("payment_gateways")
          .select("id, slug, webhook_secret_encrypted")
          .eq("slug", slug)
          .maybeSingle();

        const adapter = getAdapter(slug);
        let verified = false;
        let eventType: string | undefined;
        let externalId: string | undefined;
        let status: string | undefined;
        let reason: string | undefined;

        if (adapter) {
          const secret = decryptJson<string>(gateway?.webhook_secret_encrypted ?? null);
          try {
            const v = await adapter.verifyWebhook({
              rawBody,
              headers,
              webhookSecret: typeof secret === "string" ? secret : null,
            });
            verified = v.verified;
            eventType = v.eventType;
            externalId = v.externalId;
            status = v.status;
            reason = v.reason;
          } catch (e) {
            reason = (e as Error).message;
          }
        } else {
          reason = "No adapter registered for gateway";
        }

        let parsedPayload: unknown = null;
        try {
          parsedPayload = JSON.parse(rawBody);
        } catch {
          parsedPayload = { raw: rawBody };
        }

        await supabaseAdmin.from("webhook_logs").insert({
          gateway_id: gateway?.id ?? null,
          gateway_slug: slug,
          event_type: eventType ?? null,
          headers,
          payload: parsedPayload as any,
          verified,
          processed: verified,
          error: reason ?? null,
        });

        if (gateway) {
          await supabaseAdmin
            .from("payment_gateways")
            .update({
              webhook_verified: verified,
              last_webhook_at: new Date().toISOString(),
            })
            .eq("id", gateway.id);
        }

        if (verified && externalId && status) {
          const mapped =
            status === "succeeded"
              ? "succeeded"
              : status === "refunded"
                ? "refunded"
                : status === "failed"
                  ? "failed"
                  : status === "cancelled"
                    ? "cancelled"
                    : "processing";
          const { data: updated } = await supabaseAdmin
            .from("payment_transactions")
            .update({ status: mapped })
            .eq("external_id", externalId)
            .select("id, user_id, amount, currency, description, coupon_code")
            .maybeSingle();

          if (mapped === "succeeded" && updated?.user_id) {
            // Increment coupon usage
            if (updated.coupon_code) {
              try {
                const { data: c } = await supabaseAdmin
                  .from("coupons")
                  .select("id, used_count")
                  .eq("code", updated.coupon_code)
                  .maybeSingle();
                if (c) {
                  await supabaseAdmin
                    .from("coupons")
                    .update({ used_count: (c.used_count ?? 0) + 1 })
                    .eq("id", c.id);
                }
              } catch (e) {
                console.error("[webhook] coupon increment failed:", (e as Error).message);
              }
            }

            // Mark referral as purchased for the referred user
            try {
              await supabaseAdmin
                .from("referrals")
                .update({ status: "purchased" })
                .eq("referred_user_id", updated.user_id)
                .in("status", ["signed_up"]);
            } catch (e) {
              console.error("[webhook] referral update failed:", (e as Error).message);
            }

            try {
              const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("email, full_name")
                .eq("id", updated.user_id)
                .maybeSingle();
              if (profile?.email) {
                const { sendTemplatedEmail, notifyAdmin } = await import("@/lib/email.functions");
                await sendTemplatedEmail({
                  templateKey: "order_confirmation",
                  to: profile.email,
                  variables: {
                    customer_name: profile.full_name ?? "there",
                    order_id: updated.id.slice(0, 8).toUpperCase(),
                    amount: Number(updated.amount).toFixed(2),
                    currency: updated.currency,
                    description: updated.description ?? "The Family History Book",
                  },
                });
                await notifyAdmin("admin_new_order", {
                  customer_name: profile.full_name ?? "Customer",
                  customer_email: profile.email,
                  order_id: updated.id.slice(0, 8).toUpperCase(),
                  amount: Number(updated.amount).toFixed(2),
                  currency: updated.currency,
                  description: updated.description ?? "The Family History Book",
                });
              }
            } catch (e) {
              console.error("[webhook] order_confirmation email failed:", (e as Error).message);
            }
          }
        }

        if (!verified) {
          return new Response(JSON.stringify({ ok: false, reason: reason ?? "unverified" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
