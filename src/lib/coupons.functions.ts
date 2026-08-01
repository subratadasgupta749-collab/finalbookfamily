import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** Compute discount amount for a coupon against a price. */
export function computeDiscount(
  coupon: { discount_type: "percent" | "fixed"; discount_value: number },
  amount: number,
): number {
  if (coupon.discount_type === "percent") {
    return Math.min(amount, +(amount * (Number(coupon.discount_value) / 100)).toFixed(2));
  }
  return Math.min(amount, Number(coupon.discount_value));
}

/** Server-side validator: usable by both checkout and admin/preview. */
export async function loadValidCoupon(supabase: any, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false as const, reason: "Enter a code" };
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();
  if (error) return { ok: false as const, reason: error.message };
  if (!data) return { ok: false as const, reason: "Invalid code" };
  if (!data.active) return { ok: false as const, reason: "This coupon is not active" };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now())
    return { ok: false as const, reason: "This coupon has expired" };
  if (data.max_uses != null && data.used_count >= data.max_uses)
    return { ok: false as const, reason: "This coupon has been fully redeemed" };
  return { ok: true as const, coupon: data };
}

/** Public (authenticated) coupon preview for checkout. */
export const previewCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; amount: number }) =>
    z.object({ code: z.string().min(1).max(64), amount: z.number().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const result = await loadValidCoupon(context.supabase, data.code);
    if (!result.ok) return { ok: false, reason: result.reason };
    const discount = computeDiscount(result.coupon, data.amount);
    return {
      ok: true,
      code: result.coupon.code,
      discount,
      final: Math.max(0, +(data.amount - discount).toFixed(2)),
      discount_type: result.coupon.discount_type,
      discount_value: Number(result.coupon.discount_value),
    };
  });

/* ---------- Admin CRUD ---------- */

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, "Only A-Z, 0-9, _ and -"),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().positive().max(100000),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  active: z.boolean().default(true),
  notes: z.string().max(500).nullable().optional(),
});

export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => couponSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: any = { ...data, created_by: context.userId };
    if (data.id) {
      delete payload.id;
      delete payload.created_by;
      const { error } = await supabaseAdmin.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
