## Enterprise AI Provider Management System

The project already ships a working AI provider layer (`ai_providers`, `ai_models`, `ai_prompts`, `ai_request_logs`, dispatcher with failover, admin pages for Providers/Prompts/Logs, encrypted keys, Lovable AI support). This plan **extends** that foundation to enterprise scope rather than rebuilding it.

### What already exists (keep, don't duplicate)
- `ai_providers` (encrypted keys, priority, enabled, default, base URL, model, temperature, max_tokens, retries, timeout, budget)
- `ai_models` table
- `ai_request_logs` (status, tokens_in/out, response_time, provider_slug)
- `ai_prompts` with variables
- `src/lib/ai/dispatcher.server.ts` — failover chain, Lovable/OpenAI-compatible/Gemini/Anthropic adapters
- Admin: AI Providers / Prompts / Logs pages

### New scope

**1. Database migration** — add new tables + columns:
- `ai_providers` add columns: `organization_id`, `project_id`, `region`, `supports_vision`, `supports_reasoning`, `supports_image_gen`, `supports_embedding`, `supports_speech`, `supports_moderation`, `supports_streaming`, `supports_json_mode`, `seed`, `health_status`, `last_health_check`, `last_error`, `last_used_at`, `key_rotated_at`, `key_expires_at`, `weight` (load balancing)
- `ai_models` add: `category` (text/vision/reasoning/embedding/speech/image/code), `context_window`, `cost_input_per_1k`, `cost_output_per_1k`, `supports_streaming`, `supports_json_mode`, `is_default`, `status`
- `ai_feature_mapping` (feature_key, primary_provider_id, primary_model, fallback_chain[], routing_strategy, enabled)
- `ai_routing_rules` (name, strategy: default|priority|cheapest|fastest|quality|region|random|weighted|manual, filters jsonb, active)
- `ai_fallback_rules` (feature_key, trigger: rate_limit|timeout|api_error|quota|server_error|invalid_response|offline, fallback_provider_ids[])
- `ai_provider_health` (provider_id, checked_at, latency_ms, ok, error)
- `ai_cost_logs` (log_id ref, user_id, org_id, feature_key, provider_slug, model, tokens_in, tokens_out, cost_usd)
- `ai_usage_limits` (scope: global|role|user|org, scope_id, daily_requests, monthly_requests, daily_tokens, monthly_tokens, monthly_cost_usd)
- `ai_audit_logs` (actor, action, target, before jsonb, after jsonb)
- Indexes on all foreign keys + `(created_at desc)` on log tables
- RLS: admin-only via `has_role`

**2. Server functions** (`src/lib/ai/*.functions.ts`)
- `models.functions.ts` — CRUD, set default, filter by category
- `feature-mapping.functions.ts` — map features → provider/model + fallback chain
- `routing.functions.ts` — CRUD routing rules
- `fallback.functions.ts` — CRUD fallback rules per trigger
- `health.functions.ts` — run health check (ping each provider), history
- `limits.functions.ts` — CRUD usage limits, current usage per scope
- `cost.functions.ts` — aggregate costs (day/month/user/org/feature/provider), top models
- `audit.functions.ts` — list audit log

**3. Dispatcher upgrade** (`src/lib/ai/dispatcher.server.ts`)
- Accept `featureKey` → resolve provider+model via `ai_feature_mapping`
- Apply routing strategy (priority/cheapest/fastest/weighted/round-robin/random)
- Fallback triggered by error class (map HTTP status → trigger)
- Write to `ai_cost_logs` with computed cost from `ai_models` pricing
- Enforce `ai_usage_limits` pre-call (throw if exceeded)
- Update `ai_provider_health` on each call (rolling)
- Update `last_used_at`, `last_error` on provider

**4. Admin UI** — new/updated pages under `src/routes/_authenticated/_admin/`:
- `admin.ai-models.tsx` — Model Manager (CRUD, cost, category, defaults)
- `admin.ai-features.tsx` — Feature Mapping matrix (feature → provider/model + fallback chain drag-sort)
- `admin.ai-routing.tsx` — Routing Rules editor
- `admin.ai-fallback.tsx` — Fallback Rules per trigger type
- `admin.ai-health.tsx` — Health Monitor (real-time table + "Run all" button, uptime chart)
- `admin.ai-costs.tsx` — Cost Dashboard (day/month, per provider/model/feature/user, recharts)
- `admin.ai-limits.tsx` — Usage Limits (global/role/user/org)
- `admin.ai-keys.tsx` — API Key Manager (rotate, expiry, last-used, last-error)
- Update sidebar in `_admin.tsx` with a collapsible "AI" section grouping all AI pages
- Extend existing `admin.ai-providers.tsx` with new fields (region, capabilities, weight, org/project id)

**5. Security & audit**
- All keys stay AES-256-GCM encrypted (existing `crypto.server.ts`)
- Every mutation writes to `ai_audit_logs`
- All server fns gated by `assertAdmin`
- Never expose decrypted keys — mask everywhere

**6. Testing checklist** after ship
- Create 2 providers, set feature mapping with fallback → force first to fail (bad key) → verify auto-fallback + log
- Verify cost log rows accumulate and dashboard totals match
- Trigger health check → verify status flip
- Set daily limit → verify block after threshold

### Technical notes
- Cost: `tokens/1000 * cost_per_1k` computed server-side from `ai_models` at call time
- Routing "fastest" uses rolling avg from `ai_provider_health.latency_ms` (last 20 checks)
- "Cheapest" ranks by `(cost_input+cost_output)/2` for the resolved model
- Round-robin state kept in `ai_routing_rules.filters.rr_cursor` (advanced atomically via SQL RPC)
- Streaming/vision/etc. capability flags used to filter eligible providers per feature category
- Feature keys are free-form strings (`chat`, `interview`, `manuscript`, `translation`, `ocr`, …); existing `runAi()` callsites get a `featureKey` param

### Scope boundaries
- Uses existing encryption, existing failover skeleton, existing logs table (extended, not replaced)
- Multi-org support is scaffolded (columns + scope on limits) but a full org-management UI is out of scope for this phase
- No new external integrations beyond the provider adapters already supported

Confirm and I'll ship it.
