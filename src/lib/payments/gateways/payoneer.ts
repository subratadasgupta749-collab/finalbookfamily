import { createHmac, timingSafeEqual } from "crypto";
import type { GatewayAdapter } from "./types";

export const payoneerAdapter: GatewayAdapter = {
  slug: "payoneer",
  name: "Payoneer",
  requiredFields: ["client_id", "client_secret"],
  optionalFields: ["merchant_email"],

  async testConnection({ credentials, mode }) {
    if (!credentials.client_id || !credentials.client_secret) {
      return { ok: false, message: "Client ID and secret required" };
    }
    const base =
      mode === "live" ? "https://api.payoneer.com" : "https://api.sandbox.payoneer.com";
    try {
      const basic = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString(
        "base64",
      );
      const res = await fetch(`${base}/v4/programs/me`, {
        headers: { Authorization: `Basic ${basic}` },
      });
      if (!res.ok) return { ok: false, message: `Payoneer responded ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },

  async createCheckout({ settings, input }) {
    const instructions =
      settings.instructions ??
      `Send ${input.amount} ${input.currency} to our Payoneer account (${input.customerEmail ?? "contact us"}) and reply with the transaction reference.`;
    return { redirectUrl: null, instructions };
  },

  async verifyWebhook({ rawBody, headers, webhookSecret }) {
    const signature = headers["x-payoneer-signature"] ?? headers["X-Payoneer-Signature"];
    if (!webhookSecret || !signature) return { verified: false, reason: "missing signature" };
    const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    try {
      return { verified: timingSafeEqual(Buffer.from(digest), Buffer.from(signature)) };
    } catch {
      return { verified: false };
    }
  },
};
