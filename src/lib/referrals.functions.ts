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

/** Deterministic short referral code from the user's UUID. */
function codeFromUserId(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Returns the current user's shareable referral code. */
export const getMyReferralCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { code: codeFromUserId(context.userId) };
  });

/** Resolve a referral code (short uuid prefix) back to a user id via profiles. */
async function findReferrerByCode(admin: any, code: string) {
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 8) return null;
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .filter("id", "like", `${normalized.slice(0, 8).toLowerCase()}%`);
  if (error) return null;
  // Match by deterministic prefix (first 8 hex chars of the uuid without dashes).
  const match = (data ?? []).find(
    (r: any) => codeFromUserId(r.id) === normalized,
  );
  return match ? match.id : null;
}

/** Called from the auth page right after signup when ?ref=CODE was captured. */
export const attachReferralOnSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(6).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const referrerId = await findReferrerByCode(supabaseAdmin, data.code);
    if (!referrerId || referrerId === context.userId) return { ok: false };

    // Avoid duplicates for same referred user
    const { data: existing } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referrer_user_id", referrerId)
      .eq("referred_user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true, id: existing.id };

    const { data: row, error } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_user_id: referrerId,
        referred_user_id: context.userId,
        status: "signed_up",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

/** Returns the current user's referral history. */
export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("referrals")
      .select("*")
      .eq("referrer_user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Admin: full referrals list joined with basic profile info. */
export const adminListReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ids = new Set<string>();
    for (const r of data ?? []) {
      if (r.referrer_user_id) ids.add(r.referrer_user_id);
      if (r.referred_user_id) ids.add(r.referred_user_id);
    }
    let profileMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (ids.size > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", Array.from(ids));
      profileMap = new Map(
        (profs ?? []).map((p: any) => [p.id, { email: p.email, full_name: p.full_name }]),
      );
    }
    return (data ?? []).map((r: any) => ({
      ...r,
      referrer: profileMap.get(r.referrer_user_id) ?? null,
      referred: r.referred_user_id ? profileMap.get(r.referred_user_id) ?? null : null,
    }));
  });

/** Admin: mark a referral rewarded (typically after issuing a coupon manually). */
export const markReferralRewarded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; couponId?: string; amount?: number }) =>
    z
      .object({
        id: z.string().uuid(),
        couponId: z.string().uuid().optional(),
        amount: z.number().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("referrals")
      .update({
        status: "rewarded",
        reward_coupon_id: data.couponId ?? null,
        reward_amount: data.amount ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
