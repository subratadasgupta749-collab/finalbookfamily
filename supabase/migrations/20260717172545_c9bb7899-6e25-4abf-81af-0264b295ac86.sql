
-- book exports table
CREATE TYPE public.export_kind AS ENUM ('pdf', 'docx', 'print_pdf');

CREATE TABLE public.book_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.export_kind NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_exports TO authenticated;
GRANT ALL ON public.book_exports TO service_role;

ALTER TABLE public.book_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own exports"
  ON public.book_exports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX book_exports_book_id_idx ON public.book_exports(book_id, created_at DESC);

-- storage.objects policies for the book-exports bucket
CREATE POLICY "Users read their own book exports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'book-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users write their own book exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own book exports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
