
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  variables JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.email_templates (key, name, description, subject, html_body, text_body, variables) VALUES
('welcome', 'Welcome Email', 'Sent when a new user registers', 'Welcome to {{site_name}}, {{name}}!',
'<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#FFF8F2;color:#222"><h1 style="font-family:Fraunces,serif;color:#8B5E3C">Welcome, {{name}}!</h1><p>Thank you for joining <strong>{{site_name}}</strong>. We''re excited to help you preserve your family''s story.</p><p><a href="{{app_url}}/dashboard" style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Go to Dashboard</a></p><p style="color:#666;font-size:13px;margin-top:32px">— The {{site_name}} Team</p></div>',
'Welcome, {{name}}! Thank you for joining {{site_name}}. Visit {{app_url}}/dashboard to begin.',
'["name","site_name","app_url"]'::jsonb),

('password_reset', 'Password Reset', 'Sent when user requests a password reset', 'Reset your {{site_name}} password',
'<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#FFF8F2;color:#222"><h1 style="font-family:Fraunces,serif;color:#8B5E3C">Reset your password</h1><p>Hi {{name}}, click the button below to reset your password. This link expires in 1 hour.</p><p><a href="{{reset_url}}" style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Reset Password</a></p></div>',
'Hi {{name}}, reset your password: {{reset_url}}',
'["name","site_name","reset_url"]'::jsonb),

('order_confirmation', 'Order Confirmation', 'Sent after successful payment', 'Your {{site_name}} order is confirmed',
'<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#FFF8F2;color:#222"><h1 style="font-family:Fraunces,serif;color:#8B5E3C">Order Confirmed 🎉</h1><p>Hi {{name}}, thank you for your purchase!</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px 0;border-bottom:1px solid #eee">Order ID</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right"><code>{{order_id}}</code></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #eee">Amount</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">{{amount}}</td></tr></table><p><a href="{{app_url}}/dashboard" style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">View Dashboard</a></p></div>',
'Order {{order_id}} confirmed for {{amount}}. Thank you, {{name}}!',
'["name","order_id","amount","site_name","app_url"]'::jsonb),

('contact_reply', 'Contact Reply', 'Manual reply to a contact form message', 'Re: {{subject}}',
'<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#FFF8F2;color:#222"><p>Hi {{name}},</p><div style="white-space:pre-wrap">{{message}}</div><p style="color:#666;font-size:13px;margin-top:32px">— The {{site_name}} Team</p></div>',
'Hi {{name}},\n\n{{message}}\n\n— The {{site_name}} Team',
'["name","subject","message","site_name"]'::jsonb),

('book_ready', 'Book Ready for Download', 'Sent when export generation completes', 'Your book "{{book_title}}" is ready',
'<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#FFF8F2;color:#222"><h1 style="font-family:Fraunces,serif;color:#8B5E3C">Your book is ready 📖</h1><p>Hi {{name}}, "<strong>{{book_title}}</strong>" has been generated and is ready to download.</p><p><a href="{{download_url}}" style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Download Book</a></p></div>',
'Hi {{name}}, your book "{{book_title}}" is ready: {{download_url}}',
'["name","book_title","download_url","site_name"]'::jsonb);
