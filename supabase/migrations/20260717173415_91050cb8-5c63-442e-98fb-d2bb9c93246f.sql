
-- Enum for mode
DO $$ BEGIN
  CREATE TYPE public.gateway_mode AS ENUM ('sandbox','live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending','processing','succeeded','failed','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- payment_gateways
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  enabled boolean NOT NULL DEFAULT false,
  mode public.gateway_mode NOT NULL DEFAULT 'sandbox',
  credentials_encrypted text,
  webhook_secret_encrypted text,
  success_url text,
  cancel_url text,
  currency text NOT NULL DEFAULT 'USD',
  country_restriction text[] NOT NULL DEFAULT '{}',
  payment_instructions text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  webhook_verified boolean NOT NULL DEFAULT false,
  last_webhook_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gateways" ON public.payment_gateways FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payment_gateways_updated BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- gateway_settings (extra key/value pairs, not encrypted; use for non-secrets)
CREATE TABLE public.gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid NOT NULL REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gateway_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_settings TO authenticated;
GRANT ALL ON public.gateway_settings TO service_role;
ALTER TABLE public.gateway_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gateway settings" ON public.gateway_settings FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_gateway_settings_updated BEFORE UPDATE ON public.gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payment_transactions
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gateway_id uuid REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  gateway_slug text,
  external_id text,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.transaction_status NOT NULL DEFAULT 'pending',
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.payment_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage transactions" ON public.payment_transactions FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- webhook_logs
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id uuid REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  gateway_slug text NOT NULL,
  event_type text,
  headers jsonb,
  payload jsonb,
  verified boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhook logs" ON public.webhook_logs FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- payment_logs
CREATE TABLE public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  gateway_slug text,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_logs TO authenticated;
GRANT ALL ON public.payment_logs TO service_role;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view payment logs" ON public.payment_logs FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- refund_logs
CREATE TABLE public.refund_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  reason text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_logs TO authenticated;
GRANT ALL ON public.refund_logs TO service_role;
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage refunds" ON public.refund_logs FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_refunds_updated BEFORE UPDATE ON public.refund_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial gateways (disabled, no credentials)
INSERT INTO public.payment_gateways (slug, name, description, display_order, currency) VALUES
  ('lemonsqueezy', 'Lemon Squeezy', 'Merchant of record for digital products & subscriptions.', 1, 'USD'),
  ('wise', 'Wise', 'International bank transfers with low fees.', 2, 'USD'),
  ('payoneer', 'Payoneer', 'Global payment platform for freelancers & businesses.', 3, 'USD')
ON CONFLICT (slug) DO NOTHING;
