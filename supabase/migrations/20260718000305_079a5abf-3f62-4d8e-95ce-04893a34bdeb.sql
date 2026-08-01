
-- ============ AI PROVIDERS ============
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  provider_type text NOT NULL DEFAULT 'openai_compatible', -- openai_compatible | gemini | anthropic
  enabled boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  api_key_encrypted text,
  base_url text,
  default_model text,
  system_prompt text,
  max_tokens integer,
  temperature numeric,
  top_p numeric,
  frequency_penalty numeric,
  presence_penalty numeric,
  timeout_ms integer NOT NULL DEFAULT 60000,
  retry_attempts integer NOT NULL DEFAULT 2,
  priority integer NOT NULL DEFAULT 100,
  monthly_budget numeric,
  daily_token_limit integer,
  status text NOT NULL DEFAULT 'unknown', -- unknown | ok | error
  last_tested_at timestamptz,
  last_test_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ai_providers_single_default
  ON public.ai_providers ((is_default)) WHERE is_default;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_providers TO authenticated;
GRANT ALL ON public.ai_providers TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage providers" ON public.ai_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_providers_updated
  BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AI MODELS ============
CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text,
  is_default boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  max_tokens integer,
  temperature numeric,
  top_p numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO authenticated;
GRANT ALL ON public.ai_models TO service_role;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage models" ON public.ai_models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_models_updated
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AI PROMPTS ============
CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  system_prompt text,
  user_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompts TO authenticated;
GRANT ALL ON public.ai_prompts TO service_role;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage prompts" ON public.ai_prompts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_prompts_updated
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AI REQUEST LOGS ============
CREATE TABLE public.ai_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.ai_providers(id) ON DELETE SET NULL,
  provider_slug text,
  model text,
  prompt_key text,
  user_id uuid,
  book_id uuid,
  status text NOT NULL, -- success | error
  response_time_ms integer,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  estimated_cost numeric NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_request_logs_created_idx ON public.ai_request_logs (created_at DESC);
CREATE INDEX ai_request_logs_provider_idx ON public.ai_request_logs (provider_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_request_logs TO authenticated;
GRANT ALL ON public.ai_request_logs TO service_role;
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read logs" ON public.ai_request_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete logs" ON public.ai_request_logs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Views for convenience
CREATE VIEW public.ai_usage_logs
WITH (security_invoker = on) AS
  SELECT id, provider_id, provider_slug, model, prompt_key, user_id, book_id,
         response_time_ms, tokens_in, tokens_out, estimated_cost, created_at
  FROM public.ai_request_logs
  WHERE status = 'success';

CREATE VIEW public.ai_error_logs
WITH (security_invoker = on) AS
  SELECT id, provider_id, provider_slug, model, prompt_key, user_id, book_id,
         response_time_ms, error, created_at
  FROM public.ai_request_logs
  WHERE status = 'error';

GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT SELECT ON public.ai_error_logs TO authenticated;

-- ============ SEED PROVIDERS ============
INSERT INTO public.ai_providers (slug, name, provider_type, base_url, default_model, temperature, max_tokens, priority) VALUES
  ('gemini',     'Google Gemini', 'gemini',            'https://generativelanguage.googleapis.com', 'gemini-2.5-flash', 0.7, 2048, 10),
  ('openai',     'OpenAI',         'openai_compatible', 'https://api.openai.com/v1',                 'gpt-4o-mini',     0.7, 2048, 20),
  ('openrouter', 'OpenRouter',     'openai_compatible', 'https://openrouter.ai/api/v1',              'openai/gpt-4o-mini', 0.7, 2048, 30),
  ('deepseek',   'DeepSeek',       'openai_compatible', 'https://api.deepseek.com',                  'deepseek-chat',   0.7, 2048, 40);

INSERT INTO public.ai_models (provider_id, name, is_default, enabled)
SELECT id, default_model, true, true FROM public.ai_providers;

-- ============ SEED PROMPTS ============
INSERT INTO public.ai_prompts (key, name, description, system_prompt, user_template) VALUES
 ('interview_question', 'Interview — Next Question',
  'Generates the next single interview question for a given topic.',
  'You are a warm, empathetic interviewer helping a family capture the life story of {{subject}}. You ask ONE thoughtful, open-ended question at a time on the current topic. Questions should feel personal and invite storytelling. NEVER repeat a question already asked. Do NOT number the question or add commentary — output only the question itself.',
  'Current topic: {{topic}}\n\nQuestions already asked on this topic (build on the answers, do not repeat):\n{{topic_qa}}\n\nQuestions asked in other topics (do not repeat):\n{{prior_questions}}\n\nGenerate the next single question for the "{{topic}}" topic. Output only the question.'),
 ('biography_chapter', 'Biography — Chapter',
  'Writes one memoir chapter from interview Q&A.',
  'You are a professional biographer writing a warm, literary family memoir about {{subject}}. Write flowing third-person narrative prose. Preserve authentic voice, dates, names, and places from the answers. Never invent facts. Output ONLY valid JSON — no prose outside JSON, no markdown fences.',
  'Write chapter {{index}} of {{total}} for the memoir. Topic: "{{topic}}".\n\nInterview material (source of truth):\n{{qa_text}}\n\nReturn JSON: { "title": "…", "narrative": "400-700 words in paragraphs", "timeline": [ { "year": "…", "event": "…" } ], "quotes": [ "…" ] }'),
 ('biography_intro', 'Biography — Introduction',
  'Writes the memoir introduction.',
  'You are a professional biographer. Output ONLY valid JSON.',
  'Write a warm 150-220 word Introduction to this memoir about {{subject}}. Topics present: {{overview}}. Return JSON: { "text": "..." }'),
 ('biography_ending', 'Biography — Ending',
  'Writes the closing message.',
  'You are a professional biographer. Output ONLY valid JSON.',
  'Write a heartfelt 120-200 word closing Ending Message for this memoir about {{subject}}, addressed to future family readers. Return JSON: { "text": "..." }'),
 ('photo_caption', 'Photo Caption',
  'Generates a short caption for a photo.',
  'You write short, warm, factual photo captions for a family memoir. Two sentences max.',
  'Category: {{category}}. Existing note: {{note}}. Write a caption.'),
 ('summary', 'Summary',
  'Summarises long text into a short paragraph.',
  'You write concise, faithful summaries.',
  'Summarise the following text in 3-5 sentences:\n\n{{text}}'),
 ('title_generator', 'Title Generator',
  'Generates a short evocative title.',
  'You generate short evocative titles. Output the title only.',
  'Generate a title (max 8 words) for the following content:\n\n{{text}}'),
 ('seo', 'SEO Meta',
  'Generates SEO meta title & description.',
  'You are an SEO copywriter. Output ONLY valid JSON.',
  'Content:\n{{text}}\n\nReturn JSON: { "meta_title": "≤60 chars", "meta_description": "≤160 chars" }');
