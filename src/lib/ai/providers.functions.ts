import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptJson, maskSecret } from "@/lib/payments/crypto.server";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/* ---------------- Providers ---------------- */

export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .order("priority", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      api_key_encrypted: undefined,
      api_key_preview: r.api_key_encrypted ? "••••••••" : null,
      has_key: !!r.api_key_encrypted,
    }));
  });

const providerPatch = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  provider_type: z.enum(["openai_compatible", "gemini", "anthropic", "lovable"]).optional(),
  enabled: z.boolean().optional(),
  base_url: z.string().url().nullable().optional(),
  default_model: z.string().max(200).nullable().optional(),
  system_prompt: z.string().max(4000).nullable().optional(),
  max_tokens: z.number().int().min(1).max(200000).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  top_p: z.number().min(0).max(1).nullable().optional(),
  frequency_penalty: z.number().min(-2).max(2).nullable().optional(),
  presence_penalty: z.number().min(-2).max(2).nullable().optional(),
  timeout_ms: z.number().int().min(1000).max(600000).optional(),
  retry_attempts: z.number().int().min(0).max(10).optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  monthly_budget: z.number().nonnegative().nullable().optional(),
  daily_token_limit: z.number().int().nonnegative().nullable().optional(),
  api_key: z.string().nullable().optional(), // plaintext incoming; null to clear
});

export const updateProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof providerPatch>) => providerPatch.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, api_key, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (api_key !== undefined) {
      patch.api_key_encrypted = api_key ? encryptJson(api_key) : null;
    }
    const { error } = await supabaseAdmin.from("ai_providers").update(patch as any).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; name: string; provider_type: "openai_compatible" | "gemini" | "anthropic" | "lovable"; base_url?: string; default_model?: string }) =>
    z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60),
      name: z.string().min(1).max(100),
      provider_type: z.enum(["openai_compatible", "gemini", "anthropic", "lovable"]),
      base_url: z.string().url().optional(),
      default_model: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("ai_providers")
      .insert({
        slug: data.slug,
        name: data.name,
        provider_type: data.provider_type,
        base_url: data.base_url ?? null,
        default_model: data.default_model ?? null,
        priority: 100,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDefaultProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Clear existing default first (partial unique index would otherwise conflict).
    const { error: e1 } = await supabaseAdmin
      .from("ai_providers")
      .update({ is_default: false })
      .eq("is_default", true);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabaseAdmin
      .from("ai_providers")
      .update({ is_default: true, enabled: true })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const reorderProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order: string[] }) =>
    z.object({ order: z.array(z.string().uuid()).min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let i = 0; i < data.order.length; i++) {
      await supabaseAdmin.from("ai_providers").update({ priority: (i + 1) * 10 }).eq("id", data.order[i]);
    }
    return { ok: true };
  });

export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { testProvider } = await import("./dispatcher.server");
    return testProvider(data.id);
  });

/* ---------------- Prompts ---------------- */

export const listPrompts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("ai_prompts").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updatePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; description?: string; system_prompt?: string; user_template?: string }) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(500).nullable().optional(),
      system_prompt: z.string().max(8000).nullable().optional(),
      user_template: z.string().max(16000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("ai_prompts").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; name: string; description?: string; system_prompt?: string; user_template: string }) =>
    z.object({
      key: z.string().regex(/^[a-z0-9_]+$/).min(2).max(60),
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional(),
      system_prompt: z.string().max(8000).optional(),
      user_template: z.string().min(1).max(16000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_prompts").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_prompts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Logs & Analytics ---------------- */

export const getAiOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const startDay = new Date(now); startDay.setUTCHours(0, 0, 0, 0);
    const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [todayReq, monthReq, allTimeReq] = await Promise.all([
      supabaseAdmin.from("ai_request_logs").select("status, response_time_ms, tokens_in, tokens_out, provider_slug").gte("created_at", startDay.toISOString()),
      supabaseAdmin.from("ai_request_logs").select("status, response_time_ms, tokens_in, tokens_out, provider_slug").gte("created_at", startMonth.toISOString()),
      supabaseAdmin.from("ai_request_logs").select("id", { count: "exact", head: true }),
    ]);

    const summarize = (rows: any[]) => {
      let success = 0, error = 0, tIn = 0, tOut = 0, totalMs = 0, count = 0;
      const perProvider: Record<string, number> = {};
      for (const r of rows ?? []) {
        count++;
        if (r.status === "success") success++;
        else error++;
        tIn += r.tokens_in || 0;
        tOut += r.tokens_out || 0;
        totalMs += r.response_time_ms || 0;
        if (r.provider_slug) perProvider[r.provider_slug] = (perProvider[r.provider_slug] ?? 0) + 1;
      }
      return {
        total: count,
        success,
        error,
        successRate: count ? Math.round((success / count) * 100) : 0,
        avgMs: count ? Math.round(totalMs / count) : 0,
        tokensIn: tIn,
        tokensOut: tOut,
        perProvider,
      };
    };

    return {
      today: summarize(todayReq.data ?? []),
      month: summarize(monthReq.data ?? []),
      allTime: allTimeReq.count ?? 0,
    };
  });

export const listAiLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { page?: number; pageSize?: number; status?: string; provider?: string }) =>
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
      status: z.string().optional().default(""),
      provider: z.string().optional().default(""),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin.from("ai_request_logs").select("*", { count: "exact" });
    if (data.status) q = q.eq("status", data.status);
    if (data.provider) q = q.eq("provider_slug", data.provider);
    const { data: rows, count, error } = await q.order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });
