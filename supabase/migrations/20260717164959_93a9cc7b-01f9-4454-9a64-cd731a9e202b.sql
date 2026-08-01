
CREATE TYPE public.topic_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE public.interview_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status public.topic_status NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, topic)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_topics TO authenticated;
GRANT ALL ON public.interview_topics TO service_role;

ALTER TABLE public.interview_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interview topics" ON public.interview_topics
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.user_id = auth.uid()));

CREATE TRIGGER update_interview_topics_updated_at
BEFORE UPDATE ON public.interview_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.interview_qa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  position INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, topic, position)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_qa TO authenticated;
GRANT ALL ON public.interview_qa TO service_role;

ALTER TABLE public.interview_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interview qa" ON public.interview_qa
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.user_id = auth.uid()));

CREATE INDEX interview_qa_book_topic_idx ON public.interview_qa (book_id, topic, position);

CREATE TRIGGER update_interview_qa_updated_at
BEFORE UPDATE ON public.interview_qa
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
