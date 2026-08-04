-- ====================================================================
-- RESEND EMAIL INFRASTRUCTURE MIGRATION
-- ====================================================================

-- 1. EMAIL SETTINGS
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_enabled boolean NOT NULL DEFAULT true,
  resend_api_key_encrypted text,
  sender_name text NOT NULL DEFAULT 'My Family Book',
  sender_email text NOT NULL DEFAULT 'noreply@myfamilybook.com',
  reply_to_email text DEFAULT 'support@myfamilybook.com',
  verified_domain text DEFAULT 'myfamilybook.com',
  default_from_address text NOT NULL DEFAULT 'My Family Book <noreply@myfamilybook.com>',
  connection_status text NOT NULL DEFAULT 'untested', -- 'ok', 'error', 'untested'
  last_tested_at timestamptz,
  last_test_message text,
  enable_transactional boolean NOT NULL DEFAULT true,
  enable_newsletter boolean NOT NULL DEFAULT true,
  enable_marketing boolean NOT NULL DEFAULT true,
  auto_retry boolean NOT NULL DEFAULT true,
  open_tracking boolean NOT NULL DEFAULT true,
  click_tracking boolean NOT NULL DEFAULT true,
  rate_limit_per_min integer NOT NULL DEFAULT 600,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed single settings row if empty
INSERT INTO public.email_settings (resend_enabled, sender_name, sender_email, default_from_address)
SELECT true, 'My Family Book', 'noreply@myfamilybook.com', 'My Family Book <noreply@myfamilybook.com>'
WHERE NOT EXISTS (SELECT 1 FROM public.email_settings);

-- 2. EMAIL TEMPLATES
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'transactional', -- 'transactional', 'marketing', 'newsletter', 'system'
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. EMAIL LOGS
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id text,
  to_email text NOT NULL,
  subject text NOT NULL,
  template_key text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
  error_message text,
  variables jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz
);

-- 4. EMAIL QUEUE
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  template_key text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. NEWSLETTER SUBSCRIBERS
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'subscribed', -- 'subscribed', 'unsubscribed'
  tags text[] NOT NULL DEFAULT '{}',
  segment text NOT NULL DEFAULT 'Newsletter Subscribers',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_email_sent_at timestamptz
);

-- 6. NEWSLETTER CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  content_html text NOT NULL,
  template_key text,
  segment text NOT NULL DEFAULT 'All Users',
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduled_at timestamptz,
  sent_at timestamptz,
  stats_sent integer NOT NULL DEFAULT 0,
  stats_opened integer NOT NULL DEFAULT 0,
  stats_clicked integer NOT NULL DEFAULT 0,
  stats_bounced integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON public.newsletter_subscribers(status);

-- Grants & RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email_settings" ON public.email_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_logs" ON public.email_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_queue" ON public.email_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage newsletter_subscribers" ON public.newsletter_subscribers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage newsletter_campaigns" ON public.newsletter_campaigns FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Allow public newsletter signup
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

-- SEED ESSENTIAL TEMPLATES IF NOT EXIST
INSERT INTO public.email_templates (key, name, description, category, subject, html_body, text_body, variables, enabled) VALUES
('welcome', 'Welcome Email', 'Sent when a new user signs up', 'transactional', 'Welcome to {{site_name}}, {{user_name}}!', '<h1>Welcome, {{user_name}}!</h1><p>We are thrilled to have you at {{site_name}}.</p>', 'Welcome, {{user_name}}! We are thrilled to have you at {{site_name}}.', ARRAY['user_name', 'site_name'], true),
('verification', 'Email Verification', 'Sent for email verification link', 'transactional', 'Verify your email address for {{site_name}}', '<p>Hi {{user_name}}, click here to verify: <a href="{{verify_link}}">Verify Email</a></p>', 'Verify email: {{verify_link}}', ARRAY['user_name', 'verify_link', 'site_name'], true),
('otp', 'OTP Security Code', 'Sent when single-use security code is requested', 'transactional', 'Your Security Code: {{otp_code}}', '<h2>Your Security Code is {{otp_code}}</h2><p>This code expires in 10 minutes.</p>', 'Your security code is {{otp_code}}', ARRAY['user_name', 'otp_code'], true),
('password_reset', 'Password Reset', 'Sent for password reset link', 'transactional', 'Reset your {{site_name}} password', '<p>Hi {{user_name}}, reset password: <a href="{{reset_link}}">Reset Password</a></p>', 'Reset password: {{reset_link}}', ARRAY['user_name', 'reset_link', 'site_name'], true),
('book_generation_started', 'Book Generation Started', 'Sent when AI generation begins', 'transactional', 'Your book "{{book_title}}" is being written!', '<p>Hi {{user_name}}, our AI is crafting your family story: {{book_title}}.</p>', 'Your book {{book_title}} is being written!', ARRAY['user_name', 'book_title'], true),
('book_ready', 'Book Ready & Completed', 'Sent when book manuscript is ready', 'transactional', 'Your book "{{book_title}}" is ready!', '<h2>Congratulations {{user_name}}!</h2><p>Your book <strong>{{book_title}}</strong> is complete. <a href="{{app_url}}/books/{{book_id}}">View Book</a></p>', 'Your book {{book_title}} is ready!', ARRAY['user_name', 'book_title', 'app_url', 'book_id'], true),
('payment_success', 'Payment Successful', 'Sent after successful order/subscription', 'transactional', 'Payment Receipt for {{site_name}}', '<p>Hi {{user_name}}, thank you for your payment of {{amount}}. Receipt: {{receipt_url}}</p>', 'Payment of {{amount}} received.', ARRAY['user_name', 'amount', 'receipt_url', 'site_name'], true),
('support_reply', 'Support Ticket Reply', 'Sent when support responds', 'transactional', 'Re: {{ticket_subject}}', '<p>Hi {{user_name}},</p><div>{{reply_message}}</div>', 'Reply: {{reply_message}}', ARRAY['user_name', 'ticket_subject', 'reply_message'], true)
ON CONFLICT (key) DO NOTHING;
