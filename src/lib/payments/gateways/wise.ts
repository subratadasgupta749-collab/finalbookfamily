import type { GatewayAdapter } from "./types";

export const wiseAdapter: GatewayAdapter = {
  slug: "wise",
  name: "Wise",
  requiredFields: ["api_key"],
  optionalFields: ["merchant_email"],

  async testConnection({ credentials, mode }) {
    if (!credentials.api_key) return { ok: false, message: "API token required" };
    const base = mode === "live" ? "https://api.wise.com" : "https://api.sandbox.transferwise.tech";
    try {
      const res = await fetch(`${base}/v1/profiles`, {
        headers: { Authorization: `Bearer ${credentials.api_key}` },
      });
      if (!res.ok) return { ok: false, message: `Wise responded ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },

  async createCheckout({ settings, input }) {
    // Wise is not a hosted checkout provider. Treat as manual bank-transfer flow.
    const instructions =
      settings.instructions ??
      `Please transfer ${input.amount} ${input.currency} to our Wise account (${input.customerEmail ?? "contact us for account details"}) and email your receipt.`;
    return { redirectUrl: null, instructions };
  },

  async verifyWebhook({ headers, webhookSecret }) {
    // Wise uses public-key signatures; for the MVP we mark as unverified when no secret set.
    const signature = headers["x-signature-sha256"] ?? headers["X-Signature-SHA256"];
    if (!webhookSecret || !signature) {
      return { verified: false, reason: "Wise webhook signature verification not configured" };
    }
    // Placeholder: mark as verified if secret matches header exactly (not production-safe).
    return { verified: signature === webhookSecret };
  },
};
