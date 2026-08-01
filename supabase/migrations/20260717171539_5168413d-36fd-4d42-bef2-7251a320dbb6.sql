
CREATE TYPE public.book_theme AS ENUM ('classic', 'vintage', 'modern', 'leather_journal', 'family_album');

CREATE TABLE public.book_manuscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL UNIQUE REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme public.book_theme NOT NULL DEFAULT 'classic',
  introduction TEXT NOT NULL DEFAULT '',
  ending TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_manuscripts TO authenticated;
GRANT ALL ON public.book_manuscripts TO service_role;

ALTER TABLE public.book_manuscripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own manuscripts" ON public.book_manuscripts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_book_manuscripts_updated_at
  BEFORE UPDATE ON public.book_manuscripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.book_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  position INT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  narrative TEXT NOT NULL DEFAULT '',
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, topic)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_chapters TO authenticated;
GRANT ALL ON public.book_chapters TO service_role;

ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chapters" ON public.book_chapters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_book_chapters_updated_at
  BEFORE UPDATE ON public.book_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX book_chapters_book_id_position_idx ON public.book_chapters(book_id, position);
