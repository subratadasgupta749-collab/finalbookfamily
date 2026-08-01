
-- ============================================================
-- Enterprise AI Provider Management: schema extension
-- ============================================================

-- 1) Extend ai_providers
ALTER TABLE public.ai_providers
  ADD COLUMN IF NOT EXISTS organization_id text,
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS weight integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seed integer,
  ADD COLUMN IF NOT EXISTS supports_vision boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_reasoning boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_image_gen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_embedding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_speech boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_moderation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_streaming boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_json_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_health_check timestamptz,
  ADD COLUMN IF NOT EXISTS last_latency_ms integer,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS key_rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS key_expires_at timestamptz;

-- 2) Extend ai_models
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS context_window integer,
  ADD COLUMN IF NOT EXISTS cost_input_per_1k numeric(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_output_per_1k numeric(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supports_streaming boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_json_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 3) Feature mapping
CREATE TABLE IF NOT EXISTS public.ai_feature_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  primary_provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  primary_model text,
  fallback_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  routing_strategy text NOT NULL DEFAULT 'priority',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feature_mapping TO authenticated;
GRANT ALL ON public.ai_feature_mapping TO service_role;
ALTER TABLE public.ai_feature_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage feature mapping" ON public.ai_feature_mapping
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_feature_mapping_updated
  BEFORE UPDATE ON public.ai_feature_mapping
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Routing rules
CREATE TABLE IF NOT EXISTS public.ai_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  strategy text NOT NULL DEFAULT 'priority',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_routing_rules TO authenticated;
GRANT ALL ON public.ai_routing_rules TO service_role;
ALTER TABLE public.ai_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage routing rules" ON public.ai_routing_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_routing_rules_updated
  BEFORE UPDATE ON public.ai_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Fallback rules
CREATE TABLE IF NOT EXISTS public.ai_fallback_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  trigger text NOT NULL,
  fallback_provider_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, trigger)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_fallback_rules TO authenticated;
GRANT ALL ON public.ai_fallback_rules TO service_role;
ALTER TABLE public.ai_fallback_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage fallback rules" ON public.ai_fallback_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_fallback_rules_updated
  BEFORE UPDATE ON public.ai_fallback_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Provider health history
CREATE TABLE IF NOT EXISTS public.ai_provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  latency_ms integer,
  error text
);
CREATE INDEX IF NOT EXISTS idx_ai_provider_health_provider ON public.ai_provider_health(provider_id, checked_at DESC);
GRANT SELECT, INSERT ON public.ai_provider_health TO authenticated;
GRANT ALL ON public.ai_provider_health TO service_role;
ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read provider health" ON public.ai_provider_health
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 7) Cost logs
CREATE TABLE IF NOT EXISTS public.ai_cost_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid REFERENCES public.ai_request_logs(id) ON DELETE SET NULL,
  user_id uuid,
  organization_id text,
  feature_key text,
  provider_slug text,
  model text,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_created ON public.ai_cost_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_user ON public.ai_cost_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_logs_feature ON public.ai_cost_logs(feature_key);
GRANT SELECT ON public.ai_cost_logs TO authenticated;
GRANT ALL ON public.ai_cost_logs TO service_role;
ALTER TABLE public.ai_cost_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read cost logs" ON public.ai_cost_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 8) Usage limits
CREATE TABLE IF NOT EXISTS public.ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,           -- global | role | user | org
  scope_id text,                  -- role name / user id / org id / null for global
  daily_requests integer,
  monthly_requests integer,
  daily_tokens bigint,
  monthly_tokens bigint,
  monthly_cost_usd numeric(12,2),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_limits TO authenticated;
GRANT ALL ON public.ai_usage_limits TO service_role;
ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage usage limits" ON public.ai_usage_limits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_usage_limits_updated
  BEFORE UPDATE ON public.ai_usage_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Audit logs
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON public.ai_audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.ai_audit_logs TO authenticated;
GRANT ALL ON public.ai_audit_logs TO service_role;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit logs" ON public.ai_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
