export type GatewayCredentialField =
  | "api_key"
  | "secret_key"
  | "client_id"
  | "client_secret"
  | "merchant_email"
  | "store_id";

export type GatewayCredentials = Partial<Record<GatewayCredentialField, string>>;

export interface CheckoutInput {
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  /** URL to redirect the user to. If null, gateway is manual (show instructions). */
  redirectUrl: string | null;
  externalId?: string;
  instructions?: string;
  raw?: unknown;
}

export interface WebhookVerification {
  verified: boolean;
  eventType?: string;
  externalId?: string;
  status?: "succeeded" | "failed" | "refunded" | "pending" | "cancelled";
  reason?: string;
}

export interface GatewayAdapter {
  slug: string;
  name: string;
  /** Which credential fields this gateway uses. */
  requiredFields: GatewayCredentialField[];
  optionalFields?: GatewayCredentialField[];
  /** Simple credential ping. Returns {ok:true} on success. */
  testConnection(args: {
    credentials: GatewayCredentials;
    mode: "sandbox" | "live";
  }): Promise<{ ok: boolean; message?: string }>;
  createCheckout(args: {
    credentials: GatewayCredentials;
    mode: "sandbox" | "live";
    input: CheckoutInput;
    settings: { successUrl: string; cancelUrl: string; instructions?: string | null };
  }): Promise<CheckoutResult>;
  verifyWebhook(args: {
    rawBody: string;
    headers: Record<string, string>;
    webhookSecret: string | null;
  }): Promise<WebhookVerification>;
  /** Optional: issue a provider-side refund. If unimplemented, refunds are marked manual. */
  refund?(args: {
    credentials: GatewayCredentials;
    mode: "sandbox" | "live";
    externalId: string;
    amount: number;
    currency: string;
    reason?: string;
  }): Promise<{ ok: boolean; externalId?: string; message?: string }>;
}
