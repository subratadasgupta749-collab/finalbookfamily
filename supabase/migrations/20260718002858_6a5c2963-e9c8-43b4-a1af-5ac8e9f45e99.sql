
CREATE TYPE public.discount_type AS ENUM ('percent','fixed');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type public.discount_type NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated can read active coupons" ON public.coupons FOR SELECT TO authenticated
  USING (active = true);

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  reward_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own referrals" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id);
CREATE POLICY "Admins update referrals" ON public.referrals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete referrals" ON public.referrals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX referrals_referrer_idx ON public.referrals(referrer_user_id);

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL;

INSERT INTO public.email_templates (key, name, subject, html_body, text_body, variables, enabled)
VALUES
 ('admin_new_order','Admin: New order','New order — {{amount}} {{currency}} from {{customer_email}}',
  '<h2>New order received</h2><p><strong>Customer:</strong> {{customer_email}}</p><p><strong>Amount:</strong> {{amount}} {{currency}}</p><p><strong>Gateway:</strong> {{gateway}}</p><p><strong>Transaction:</strong> {{transaction_id}}</p><p><a href="{{app_url}}/admin/orders">View in dashboard</a></p>',
  'New order from {{customer_email}} — {{amount}} {{currency}} via {{gateway}}. Transaction: {{transaction_id}}',
  '["customer_email","amount","currency","gateway","transaction_id"]'::jsonb, true),
 ('admin_new_message','Admin: New contact message','New contact message from {{name}}',
  '<h2>New message</h2><p><strong>From:</strong> {{name}} &lt;{{email}}&gt;</p><p><strong>Subject:</strong> {{subject}}</p><blockquote>{{message}}</blockquote><p><a href="{{app_url}}/admin/messages">Reply from dashboard</a></p>',
  'From {{name}} <{{email}}>: {{subject}}

{{message}}',
  '["name","email","subject","message"]'::jsonb, true)
ON CONFLICT (key) DO NOTHING;
