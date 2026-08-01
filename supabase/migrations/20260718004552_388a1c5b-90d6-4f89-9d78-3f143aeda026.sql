INSERT INTO public.ai_providers (slug, name, provider_type, base_url, default_model, enabled, priority)
VALUES ('lovable', 'Lovable AI Gateway', 'lovable', 'https://ai.gateway.lovable.dev/v1', 'google/gemini-3-flash-preview', true, 5)
ON CONFLICT (slug) DO NOTHING;