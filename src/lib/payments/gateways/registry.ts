import type { GatewayAdapter } from "./types";
import { lemonSqueezyAdapter } from "./lemonsqueezy";
import { wiseAdapter } from "./wise";
import { payoneerAdapter } from "./payoneer";

/**
 * To add a new payment gateway:
 *   1. Create an adapter file that exports a `GatewayAdapter`.
 *   2. Register it here.
 *   3. Insert a row into `public.payment_gateways` (slug matches adapter.slug).
 * No frontend changes required — the admin panel is fully data-driven.
 */
const adapters: GatewayAdapter[] = [lemonSqueezyAdapter, wiseAdapter, payoneerAdapter];

export function getAdapter(slug: string): GatewayAdapter | null {
  return adapters.find((a) => a.slug === slug) ?? null;
}

export function listAdapters(): GatewayAdapter[] {
  return [...adapters];
}
