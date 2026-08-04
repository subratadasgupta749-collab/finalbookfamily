// Provider-agnostic AI dispatcher. All AI calls in the app go through this.
// Providers, models, feature mapping, routing, fallback & cost are all
// configured from the Admin Panel — never hardcoded.

import { decryptJson } from "@/lib/payments/crypto.server";

type ProviderRow = {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  enabled: boolean;
  is_default: boolean;
  api_key_encrypted: string | null;
  base_url: string | null;
  default_model: string | null;
  system_prompt: string | null;
  max_tokens: number | null;
  temperature: number | null;
  top_p: number | null;
  frequency_penalty: number | null;
  presence_penalty: number | null;
  timeout_ms: number;
  retry_attempts: number;
  priority: number;
  weight?: number | null;
};

export type AiCallOptions = {
  system?: string;
  user: string;
  promptKey?: string;
  featureKey?: string;
  userId?: string | null;
  bookId?: string | null;
  temperature?: number;
  maxTokens?: number;
  providerSlug?: string;
  model?: string;
};

export type AiCallResult = {
  text: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  responseTimeMs: number;
  costUsd: number;
};

const RR_STATE: Record<string, number> = {};

async function loadAllProviders(): Promise<ProviderRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ai_providers")
    .select("*")
    .eq("enabled", true)
    .order("is_default", { ascending: false })
    .order("priority", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProviderRow[];
}

function decryptKey(row: ProviderRow): string | null {
  if (!row.api_key_encrypted) return null;
  const v = decryptJson<string>(row.api_key_encrypted);
  return typeof v === "string" ? v : null;
}

async function getModelCost(model: string): Promise<{ input: number; output: number }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_models")
      .select("cost_input_per_1k, cost_output_per_1k")
      .eq("name", model)
      .maybeSingle();
    return {
      input: Number((data as any)?.cost_input_per_1k ?? 0),
      output: Number((data as any)?.cost_output_per_1k ?? 0),
    };
  } catch {
    return { input: 0, output: 0 };
  }
}

async function writeCost(entry: {
  logId: string | null;
  userId: string | null;
  featureKey: string | null;
  providerSlug: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_cost_logs").insert({
      log_id: entry.logId,
      user_id: entry.userId,
      feature_key: entry.featureKey,
      provider_slug: entry.providerSlug,
      model: entry.model,
      tokens_in: entry.tokensIn,
      tokens_out: entry.tokensOut,
      cost_usd: entry.costUsd,
    });
  } catch {}
}

async function updateProviderHealth(providerId: string, ok: boolean, latency: number, error?: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_provider_health").insert({
      provider_id: providerId, ok, latency_ms: latency, error: error?.slice(0, 500) ?? null,
    });
    await supabaseAdmin.from("ai_providers").update({
      health_status: ok ? "healthy" : "degraded",
      last_health_check: new Date().toISOString(),
      last_latency_ms: latency,
      last_error: ok ? null : (error?.slice(0, 500) ?? null),
      last_used_at: new Date().toISOString(),
    }).eq("id", providerId);
  } catch {}
}

async function logCall(entry: {
  provider_id: string | null;
  provider_slug: string | null;
  model: string | null;
  prompt_key?: string | null;
  user_id?: string | null;
  book_id?: string | null;
  status: "success" | "error";
  response_time_ms: number;
  tokens_in?: number;
  tokens_out?: number;
  error?: string;
}): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("ai_request_logs").insert({
      provider_id: entry.provider_id,
      provider_slug: entry.provider_slug,
      model: entry.model,
      prompt_key: entry.prompt_key ?? null,
      user_id: entry.user_id ?? null,
      book_id: entry.book_id ?? null,
      status: entry.status,
      response_time_ms: entry.response_time_ms,
      tokens_in: entry.tokens_in ?? 0,
      tokens_out: entry.tokens_out ?? 0,
      error: entry.error ?? null,
    }).select("id").single();
    return (data as any)?.id ?? null;
  } catch { return null; }
}

function resolveApiKey(row: ProviderRow): { key: string; source: string } {
  const decrypted = decryptKey(row);
  if (decrypted && decrypted.trim().length > 0) {
    const sanitized = decrypted.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
    return { key: sanitized, source: "Database (Encrypted)" };
  }

  // Fallback to environment variables
  if (row.provider_type === "gemini" || row.slug.includes("gemini")) {
    const envKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_STUDIO_API_KEY ||
      process.env.GOOGLE_API_KEY;
    if (envKey && envKey.trim().length > 0) {
      const sanitized = envKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
      return { key: sanitized, source: "Environment Variable (GEMINI_API_KEY)" };
    }
  }

  if (row.provider_type === "openai_compatible" || row.slug.includes("openai")) {
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey && envKey.trim().length > 0) {
      const sanitized = envKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
      return { key: sanitized, source: "Environment Variable (OPENAI_API_KEY)" };
    }
  }

  if (row.provider_type === "anthropic" || row.slug.includes("anthropic")) {
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey && envKey.trim().length > 0) {
      const sanitized = envKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
      return { key: sanitized, source: "Environment Variable (ANTHROPIC_API_KEY)" };
    }
  }

  if (row.provider_type === "lovable") {
    const envKey = process.env.LOVABLE_API_KEY;
    if (envKey && envKey.trim().length > 0) {
      const sanitized = envKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
      return { key: sanitized, source: "Environment Variable (LOVABLE_API_KEY)" };
    }
  }

  // Generic fallback
  const genericKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY;
  if (genericKey && genericKey.trim().length > 0) {
    const sanitized = genericKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
    return { key: sanitized, source: "Environment Variable (Generic)" };
  }

  return { key: "", source: "None" };
}

/* ---------- Provider adapters ---------- */

async function callOpenAiCompatible(
  row: ProviderRow,
  apiKey: string,
  model: string,
  opts: AiCallOptions,
  overrides?: { baseUrl?: string; authHeader?: "bearer" | "lovable" },
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const sanitizedKey = apiKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");
  const rawBase = overrides?.baseUrl ?? row.base_url ?? "https://api.openai.com/v1";
  const base = rawBase.replace(/\/+$/, "");
  const url = `${base}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages: [
      ...(opts.system || row.system_prompt
        ? [{ role: "system", content: opts.system ?? row.system_prompt }]
        : []),
      { role: "user", content: opts.user },
    ],
  };
  const temp = opts.temperature ?? row.temperature;
  const maxTok = opts.maxTokens ?? row.max_tokens;
  if (temp != null) body.temperature = temp;
  if (maxTok != null) body.max_tokens = maxTok;
  if (row.top_p != null) body.top_p = row.top_p;
  if (row.frequency_penalty != null) body.frequency_penalty = row.frequency_penalty;
  if (row.presence_penalty != null) body.presence_penalty = row.presence_penalty;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const isLovableHeader = overrides?.authHeader === "lovable";
  if (isLovableHeader) {
    headers["Lovable-API-Key"] = sanitizedKey;
    headers["X-Lovable-AIG-SDK"] = "custom";
  } else {
    headers["Authorization"] = `Bearer ${sanitizedKey}`;
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), row.timeout_ms || 60000);
  try {
    console.log(`[AI Audit Call] Provider: ${row.name} (${row.slug}) | Model: ${model} | URL: ${url}`);
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      const auditLog = `[AI Provider Audit Error]
Provider: ${row.name} (${row.slug}) [Type: ${row.provider_type}]
Base URL: ${base}
Model: ${model}
Auth Method: ${isLovableHeader ? "Lovable-API-Key Header" : "Bearer Token Header"}
HTTP Status: ${res.status} ${res.statusText}
Raw Error Response: ${errorText}`;

      console.error(auditLog);
      throw new Error(`[${res.status}] ${row.name} API Error: ${errorText}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Empty response from OpenAI-compatible provider.");
    return {
      text,
      tokensIn: json.usage?.prompt_tokens ?? 0,
      tokensOut: json.usage?.completion_tokens ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(
  row: ProviderRow,
  apiKey: string,
  model: string,
  opts: AiCallOptions,
) {
  const sanitizedKey = apiKey.trim().replace(/^["']|["']$/g, "").replace(/[\s\r\n]+/g, "");

  // Format Check Safeguard
  if (sanitizedKey.startsWith("sk-")) {
    throw new Error(
      `[API Key Format Mismatch] Key starts with 'sk-' (OpenAI key format), but you are requesting Google Gemini! Please enter a valid Google AI Studio key (starts with 'AIzaSy').`,
    );
  }

  // Base URL for Google AI Studio
  const rawBase = row.base_url || "https://generativelanguage.googleapis.com";
  const base = rawBase
    .replace(/\/+(v1beta|v1|models)*\/*$/, "")
    .replace(/\/+$/, "");

  // Clean model name (strip "models/" prefix if present)
  let cleanModel = (model || row.default_model || "gemini-1.5-flash").replace(/^models\//, "");
  if (cleanModel === "gemini-2.5-flash") {
    cleanModel = "gemini-1.5-flash"; // Auto-correct legacy model name
  }

  const url = `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(sanitizedKey)}`;

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: opts.user }],
      },
    ],
    generationConfig: {
      ...(opts.temperature != null
        ? { temperature: opts.temperature }
        : row.temperature != null
        ? { temperature: row.temperature }
        : {}),
      ...(opts.maxTokens != null
        ? { maxOutputTokens: opts.maxTokens }
        : row.max_tokens != null
        ? { maxOutputTokens: row.max_tokens }
        : {}),
      ...(row.top_p != null ? { topP: row.top_p } : {}),
    },
  };

  const sys = opts.system ?? row.system_prompt;
  if (sys) body.systemInstruction = { parts: [{ text: sys }] };

  const maskedKey = sanitizedKey.length > 8 ? `${sanitizedKey.slice(0, 6)}...${sanitizedKey.slice(-4)}` : "Present";
  console.log(`[AI Audit Call] Provider: Google Gemini | Model: ${cleanModel} | Base: ${base} | Key: ${maskedKey}`);

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), row.timeout_ms || 60000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": sanitizedKey, // Dual auth: Query Param + Header for 100% Google Gateway compatibility
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsedError: string = errorText;
      try {
        const errJson = JSON.parse(errorText);
        parsedError = errJson?.error?.message || errorText;
      } catch {}

      const auditLog = `[Google Gemini Audit Error]
Provider: ${row.name} (${row.slug}) [Type: gemini]
Base URL: ${base}
Model: ${cleanModel}
Auth Status: Key Present (${maskedKey} [Length: ${sanitizedKey.length}])
HTTP Status: ${res.status} ${res.statusText}
Google Error Response: ${parsedError}`;

      console.error(auditLog);
      throw new Error(`[${res.status}] Gemini API Error: ${parsedError}`);
    }

    const json = (await res.json()) as any;
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      if (json.candidates?.[0]?.finishReason) {
        throw new Error(`Gemini response blocked. Finish reason: ${json.candidates[0].finishReason}`);
      }
      throw new Error("Empty response from Google Gemini API.");
    }

    return {
      text,
      tokensIn: json.usageMetadata?.promptTokenCount ?? 0,
      tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(
  row: ProviderRow,
  apiKey: string,
  model: string,
  opts: AiCallOptions,
) {
  const rawBase = row.base_url || "https://api.anthropic.com";
  const base = rawBase.replace(/\/+$/, "");
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? row.max_tokens ?? 1024,
    messages: [{ role: "user", content: opts.user }],
  };
  const sys = opts.system ?? row.system_prompt;
  if (sys) body.system = sys;
  const temp = opts.temperature ?? row.temperature;
  if (temp != null) body.temperature = temp;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), row.timeout_ms || 60000);
  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`[${res.status}] Anthropic API Error: ${errorText}`);
    }

    const json = (await res.json()) as any;
    const text = (json.content ?? []).map((c: any) => c.text ?? "").join("").trim();
    if (!text) throw new Error("Empty response from Anthropic.");
    return {
      text,
      tokensIn: json.usage?.input_tokens ?? 0,
      tokensOut: json.usage?.output_tokens ?? 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider(row: ProviderRow, opts: AiCallOptions): Promise<AiCallResult> {
  const keyInfo = resolveApiKey(row);
  if (!keyInfo.key) {
    throw new Error(
      `[AI Provider Config Error] ${row.name} (${row.slug}): No API Key configured in Database or Environment Variables.`,
    );
  }

  const model = opts.model || row.default_model || "gemini-1.5-flash";

  // Safeguard Auto-Detection: Determine if this request MUST route to Gemini
  const isLovable = row.provider_type === "lovable";
  const modelLower = model.toLowerCase();
  const slugLower = row.slug.toLowerCase();
  const baseUrlLower = (row.base_url || "").toLowerCase();

  const isGeminiModel = modelLower.includes("gemini");
  const isGeminiSlug = slugLower.includes("gemini");
  const isGeminiUrl = baseUrlLower.includes("generativelanguage.googleapis.com");
  const isGeminiType = row.provider_type === "gemini" || isGeminiModel || isGeminiSlug || isGeminiUrl;

  const started = Date.now();
  let attempt = 0;
  const maxAttempts = Math.max(1, (row.retry_attempts ?? 0) + 1);
  let lastErr: unknown;

  while (attempt < maxAttempts) {
    try {
      let out: { text: string; tokensIn: number; tokensOut: number };

      if (isGeminiType) {
        // Enforce Gemini API Handler
        out = await callGemini(row, keyInfo.key, model, opts);
      } else if (row.provider_type === "anthropic" || modelLower.includes("claude")) {
        out = await callAnthropic(row, keyInfo.key, model, opts);
      } else if (isLovable) {
        out = await callOpenAiCompatible(row, keyInfo.key, model, opts, {
          baseUrl: row.base_url ?? "https://ai.gateway.lovable.dev/v1",
          authHeader: "lovable",
        });
      } else {
        out = await callOpenAiCompatible(row, keyInfo.key, model, opts);
      }

      const responseTimeMs = Date.now() - started;
      const cost = await getModelCost(model);
      const costUsd = (out.tokensIn / 1000) * cost.input + (out.tokensOut / 1000) * cost.output;

      return {
        text: out.text,
        provider: row.slug,
        model,
        tokensIn: out.tokensIn,
        tokensOut: out.tokensOut,
        responseTimeMs,
        costUsd,
      };
    } catch (err) {
      lastErr = err;
      attempt++;
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/* ---------- Feature-mapped routing + fallback ---------- */

async function loadFeatureMapping(featureKey: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("ai_feature_mapping")
      .select("*").eq("feature_key", featureKey).eq("enabled", true).maybeSingle();
    return data as any;
  } catch { return null; }
}

async function buildChain(opts: AiCallOptions, providers: ProviderRow[]): Promise<{ chain: ProviderRow[]; modelOverride?: string }> {
  if (opts.providerSlug) {
    const p = providers.filter((x) => x.slug === opts.providerSlug);
    if (p.length === 0) throw new Error(`Provider "${opts.providerSlug}" is not enabled.`);
    return { chain: p };
  }
  if (opts.featureKey) {
    const mapping = await loadFeatureMapping(opts.featureKey);
    if (mapping) {
      const byId = new Map(providers.map((p) => [p.id, p]));
      const ordered: ProviderRow[] = [];
      if (mapping.primary_provider_id && byId.has(mapping.primary_provider_id)) ordered.push(byId.get(mapping.primary_provider_id)!);
      for (const id of (mapping.fallback_chain ?? []) as string[]) {
        if (byId.has(id) && !ordered.find((p) => p.id === id)) ordered.push(byId.get(id)!);
      }
      // Apply routing strategy on the primary set
      const strategy = mapping.routing_strategy ?? "priority";
      if (ordered.length > 1) {
        if (strategy === "random") ordered.sort(() => Math.random() - 0.5);
        else if (strategy === "round_robin") {
          const idx = (RR_STATE[opts.featureKey] ?? 0) % ordered.length;
          RR_STATE[opts.featureKey] = idx + 1;
          const rotated = [...ordered.slice(idx), ...ordered.slice(0, idx)];
          return { chain: rotated, modelOverride: mapping.primary_model || undefined };
        } else if (strategy === "weighted") {
          ordered.sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
        } else if (strategy === "fastest") {
          // Use last_latency_ms ascending
          ordered.sort((a: any, b: any) => (a.last_latency_ms ?? 99999) - (b.last_latency_ms ?? 99999));
        }
        // "priority" | "manual" | "default" keep original order
      }
      if (ordered.length > 0) return { chain: ordered, modelOverride: mapping.primary_model || undefined };
    }
  }
  return { chain: providers };
}

export async function testProvider(providerId: string): Promise<{ ok: boolean; message: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("ai_providers").select("*").eq("id", providerId).maybeSingle();
  if (error || !data) return { ok: false, message: error?.message ?? "Provider not found" };
  const row = data as ProviderRow;

  const keyInfo = resolveApiKey(row);
  const model = row.default_model || "gemini-1.5-flash";
  const maskedKey = keyInfo.key ? `${keyInfo.key.slice(0, 6)}... (${keyInfo.source})` : "Missing Key";
  const rawBase = row.base_url || (row.provider_type === "gemini" ? "https://generativelanguage.googleapis.com" : "https://api.openai.com/v1");

  console.log(`[AI Provider Audit Test]
Provider: ${row.name} (${row.slug})
Type: ${row.provider_type}
Base URL: ${rawBase}
Model: ${model}
Auth Status: Key Source: ${keyInfo.source} | Key: ${maskedKey}`);

  const t0 = Date.now();
  try {
    const res = await callProvider(row, { user: "Reply with the single word: pong", maxTokens: 8, temperature: 0 });
    const latency = Date.now() - t0;
    await updateProviderHealth(row.id, true, latency);
    await supabaseAdmin.from("ai_providers").update({
      status: "ok",
      last_tested_at: new Date().toISOString(),
      last_test_message: `OK — ${res.model} (${res.responseTimeMs}ms) [Key: ${keyInfo.source}]`,
    }).eq("id", providerId);

    return {
      ok: true,
      message: `OK — ${row.name} (${res.model}) responded in ${res.responseTimeMs}ms. [Key Source: ${keyInfo.source}]`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const latency = Date.now() - t0;
    await updateProviderHealth(row.id, false, latency, msg);

    const detailedMessage = `[Provider Audit Failure]
Provider: ${row.name} (${row.slug}) | Type: ${row.provider_type}
Base URL: ${rawBase} | Model: ${model}
Auth: ${keyInfo.source}
Error Detail: ${msg}`;

    await supabaseAdmin.from("ai_providers").update({
      status: "error",
      last_tested_at: new Date().toISOString(),
      last_test_message: detailedMessage.slice(0, 1000),
    }).eq("id", providerId);

    return { ok: false, message: msg };
  }
}

export async function runAi(opts: AiCallOptions): Promise<AiCallResult> {
  const providers = await loadAllProviders();
  if (providers.length === 0) throw new Error("No AI provider is enabled. An administrator must enable one in Admin → AI Providers.");

  const { chain, modelOverride } = await buildChain(opts, providers);
  if (chain.length === 0) throw new Error("No provider available for this feature.");
  const effectiveOpts: AiCallOptions = { ...opts, model: opts.model ?? modelOverride };

  let lastError = "";
  for (const p of chain) {
    const started = Date.now();
    try {
      const res = await callProvider(p, effectiveOpts);
      const logId = await logCall({
        provider_id: p.id, provider_slug: p.slug, model: res.model, prompt_key: opts.promptKey,
        user_id: opts.userId ?? null, book_id: opts.bookId ?? null, status: "success",
        response_time_ms: res.responseTimeMs, tokens_in: res.tokensIn, tokens_out: res.tokensOut,
      });
      await updateProviderHealth(p.id, true, res.responseTimeMs);
      await writeCost({
        logId, userId: opts.userId ?? null, featureKey: opts.featureKey ?? null,
        providerSlug: p.slug, model: res.model, tokensIn: res.tokensIn, tokensOut: res.tokensOut, costUsd: res.costUsd,
      });
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      const dt = Date.now() - started;
      await logCall({
        provider_id: p.id, provider_slug: p.slug, model: p.default_model, prompt_key: opts.promptKey,
        user_id: opts.userId ?? null, book_id: opts.bookId ?? null, status: "error",
        response_time_ms: dt, error: msg.slice(0, 1000),
      });
      await updateProviderHealth(p.id, false, dt, msg);
    }
  }
  throw new Error(`All AI providers failed. Last error: ${lastError}`);
}

export async function renderPrompt(key: string, vars: Record<string, string>): Promise<{ system: string | null; user: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("ai_prompts").select("system_prompt, user_template").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Prompt "${key}" is not configured.`);
  const interp = (s: string | null) =>
    (s ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
  return { system: data.system_prompt ? interp(data.system_prompt) : null, user: interp(data.user_template) };
}
