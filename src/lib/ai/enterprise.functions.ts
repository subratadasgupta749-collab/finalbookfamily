import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

async function audit(actor: { userId: string; email?: string | null }, action: string, targetType: string, targetId: string, before: any, after: any) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_audit_logs").insert({
      actor_id: actor.userId, actor_email: actor.email ?? null,
      action, target_type: targetType, target_id: targetId, before, after,
    });
  } catch {}
}

/* ============ MODELS ============ */

export const listModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_models").select("*, ai_providers(slug,name)").order("category").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const modelSchema = z.object({
  id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  label: z.string().max(200).nullable().optional(),
  category: z.enum(["text","vision","reasoning","embedding","speech","image","code"]),
  context_window: z.number().int().nullable().optional(),
  max_tokens: z.number().int().nullable().optional(),
  cost_input_per_1k: z.number().nonnegative().default(0),
  cost_output_per_1k: z.number().nonnegative().default(0),
  supports_streaming: z.boolean().default(true),
  supports_json_mode: z.boolean().default(false),
  is_default: z.boolean().default(false),
  enabled: z.boolean().default(true),
  status: z.enum(["active","deprecated","beta"]).default("active"),
});

export const upsertModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => modelSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("ai_models").update(rest as any).eq("id", id);
      if (error) throw new Error(error.message);
      await audit({ userId: context.userId }, "update", "ai_model", id, null, rest);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("ai_models").insert(rest as any).select("id").single();
    if (error) throw new Error(error.message);
    await audit({ userId: context.userId }, "create", "ai_model", (row as any).id, null, rest);
    return { id: (row as any).id };
  });

export const deleteModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit({ userId: context.userId }, "delete", "ai_model", data.id, null, null);
    return { ok: true };
  });

/* ============ FEATURE MAPPING ============ */

export const listFeatureMappings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_feature_mapping").select("*").order("feature_key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const featureMapSchema = z.object({
  id: z.string().uuid().optional(),
  feature_key: z.string().regex(/^[a-z0-9_]+$/).min(2).max(60),
  label: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  primary_provider_id: z.string().uuid().nullable().optional(),
  primary_model: z.string().max(200).nullable().optional(),
  fallback_chain: z.array(z.string().uuid()).default([]),
  routing_strategy: z.enum(["priority","cheapest","fastest","quality","region","random","weighted","manual","round_robin","default"]).default("priority"),
  enabled: z.boolean().default(true),
});

export const upsertFeatureMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => featureMapSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("ai_feature_mapping").update(rest as any).eq("id", id);
      if (error) throw new Error(error.message);
      await audit({ userId: context.userId }, "update", "ai_feature_mapping", id, null, rest);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("ai_feature_mapping").insert(rest as any).select("id").single();
    if (error) throw new Error(error.message);
    await audit({ userId: context.userId }, "create", "ai_feature_mapping", (row as any).id, null, rest);
    return { id: (row as any).id };
  });

export const deleteFeatureMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_feature_mapping").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit({ userId: context.userId }, "delete", "ai_feature_mapping", data.id, null, null);
    return { ok: true };
  });

/* ============ ROUTING RULES ============ */

export const listRoutingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_routing_rules").select("*").order("priority");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const routingSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  strategy: z.enum(["priority","cheapest","fastest","quality","region","random","weighted","manual","round_robin","default"]),
  filters: z.record(z.string(), z.any()).default({}),
  active: z.boolean().default(true),
  priority: z.number().int().default(100),
});

export const upsertRoutingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => routingSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("ai_routing_rules").update(rest as any).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("ai_routing_rules").insert(rest as any).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteRoutingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_routing_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ FALLBACK RULES ============ */

export const listFallbackRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_fallback_rules").select("*").order("feature_key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const fallbackSchema = z.object({
  id: z.string().uuid().optional(),
  feature_key: z.string().min(1).max(60),
  trigger: z.enum(["rate_limit","timeout","api_error","quota","server_error","invalid_response","offline"]),
  fallback_provider_ids: z.array(z.string().uuid()).default([]),
  enabled: z.boolean().default(true),
});

export const upsertFallbackRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => fallbackSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("ai_fallback_rules").update(rest as any).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("ai_fallback_rules").insert(rest as any).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteFallbackRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_fallback_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ HEALTH ============ */

export const runHealthCheckAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { testProvider } = await import("./dispatcher.server");
    const { data: providers } = await supabaseAdmin.from("ai_providers").select("id, name").eq("enabled", true);
    const results: any[] = [];
    for (const p of providers ?? []) {
      const r = await testProvider((p as any).id);
      results.push({ id: (p as any).id, name: (p as any).name, ...r });
    }
    return results;
  });

export const listHealthHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_provider_health")
      .select("*, ai_providers(name,slug)")
      .order("checked_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ============ USAGE LIMITS ============ */

export const listUsageLimits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_usage_limits").select("*").order("scope");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const limitSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(["global","role","user","org"]),
  scope_id: z.string().max(200).nullable().optional(),
  daily_requests: z.number().int().nullable().optional(),
  monthly_requests: z.number().int().nullable().optional(),
  daily_tokens: z.number().int().nullable().optional(),
  monthly_tokens: z.number().int().nullable().optional(),
  monthly_cost_usd: z.number().nullable().optional(),
  enabled: z.boolean().default(true),
});

export const upsertUsageLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => limitSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("ai_usage_limits").update(rest as any).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabaseAdmin.from("ai_usage_limits").insert(rest as any).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const deleteUsageLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_usage_limits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ COSTS ============ */

export const getCostOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const dayStart = new Date(now); dayStart.setUTCHours(0,0,0,0);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [day, month, total] = await Promise.all([
      supabaseAdmin.from("ai_cost_logs").select("cost_usd, tokens_in, tokens_out, provider_slug, feature_key, model, user_id").gte("created_at", dayStart.toISOString()),
      supabaseAdmin.from("ai_cost_logs").select("cost_usd, tokens_in, tokens_out, provider_slug, feature_key, model, user_id").gte("created_at", monthStart.toISOString()),
      supabaseAdmin.from("ai_cost_logs").select("cost_usd", { count: "exact", head: false }),
    ]);
    const sum = (rows: any[]) => {
      let cost = 0, tin = 0, tout = 0;
      const perProvider: Record<string, number> = {};
      const perFeature: Record<string, number> = {};
      const perModel: Record<string, number> = {};
      const perUser: Record<string, number> = {};
      for (const r of rows ?? []) {
        cost += Number(r.cost_usd ?? 0);
        tin += r.tokens_in ?? 0; tout += r.tokens_out ?? 0;
        if (r.provider_slug) perProvider[r.provider_slug] = (perProvider[r.provider_slug] ?? 0) + Number(r.cost_usd ?? 0);
        if (r.feature_key) perFeature[r.feature_key] = (perFeature[r.feature_key] ?? 0) + Number(r.cost_usd ?? 0);
        if (r.model) perModel[r.model] = (perModel[r.model] ?? 0) + Number(r.cost_usd ?? 0);
        if (r.user_id) perUser[r.user_id] = (perUser[r.user_id] ?? 0) + Number(r.cost_usd ?? 0);
      }
      return { cost, tokensIn: tin, tokensOut: tout, perProvider, perFeature, perModel, perUser };
    };
    let totalCost = 0;
    for (const r of total.data ?? []) totalCost += Number((r as any).cost_usd ?? 0);
    return { day: sum(day.data ?? []), month: sum(month.data ?? []), totalCost };
  });

/* ============ AUDIT ============ */

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
