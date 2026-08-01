
CREATE TYPE public.book_status AS ENUM ('draft', 'in_progress', 'completed');

CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  gender TEXT,
  date_of_birth DATE,
  country TEXT,
  relationship TEXT,
  status public.book_status NOT NULL DEFAULT 'draft',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own books" ON public.books FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own books" ON public.books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books" ON public.books FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own books" ON public.books FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX books_user_id_updated_at_idx ON public.books (user_id, updated_at DESC);

CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
