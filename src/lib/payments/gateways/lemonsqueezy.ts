import { createHmac, timingSafeEqual } from "crypto";
import type { GatewayAdapter } from "./types";

export const lemonSqueezyAdapter: GatewayAdapter = {
  slug: "lemonsqueezy",
  name: "Lemon Squeezy",
  requiredFields: ["api_key", "store_id"],
  optionalFields: ["merchant_email"],

  async testConnection({ credentials }) {
    if (!credentials.api_key) return { ok: false, message: "API key required" };
    try {
      const res = await fetch("https://api.lemonsqueezy.com/v1/users/me", {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${credentials.api_key}`,
        },
      });
      if (!res.ok) return { ok: false, message: `Lemon Squeezy responded ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },

  async createCheckout({ credentials, input, settings }) {
    if (!credentials.api_key || !credentials.store_id) {
      throw new Error("Lemon Squeezy credentials missing");
    }
    const body = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: input.customerEmail,
            custom: input.metadata ?? {},
          },
          product_options: {
            redirect_url: settings.successUrl,
          },
          checkout_options: { embed: false },
        },
        relationships: {
          store: { data: { type: "stores", id: String(credentials.store_id) } },
        },
      },
    };
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${credentials.api_key}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      data?: { id: string; attributes?: { url: string } };
      errors?: unknown;
    };
    if (!res.ok || !json.data?.attributes?.url) {
      throw new Error(`Lemon Squeezy checkout failed: ${JSON.stringify(json.errors ?? json)}`);
    }
    return {
      redirectUrl: json.data.attributes.url,
      externalId: json.data.id,
      raw: json,
    };
  },

  async verifyWebhook({ rawBody, headers, webhookSecret }) {
    const signature = headers["x-signature"] ?? headers["X-Signature"];
    if (!webhookSecret || !signature) {
      return { verified: false, reason: "missing signature or secret" };
    }
    const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    let verified = false;
    try {
      verified = timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      verified = false;
    }
    let eventType: string | undefined;
    let externalId: string | undefined;
    let status: "succeeded" | "failed" | "refunded" | undefined;
    try {
      const payload = JSON.parse(rawBody) as {
        meta?: { event_name?: string };
        data?: { id?: string; attributes?: { status?: string } };
      };
      eventType = payload.meta?.event_name;
      externalId = payload.data?.id;
      const s = payload.data?.attributes?.status;
      if (s === "paid") status = "succeeded";
      else if (s === "refunded") status = "refunded";
      else if (s === "failed") status = "failed";
    } catch {
      /* ignore */
    }
    return { verified, eventType, externalId, status };
  },
};
