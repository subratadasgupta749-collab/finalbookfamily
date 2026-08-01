
-- Photo category enum
CREATE TYPE public.photo_category AS ENUM ('baby','school','wedding','career','family','retirement');

-- Photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  category public.photo_category NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  size_bytes BIGINT,
  width INT,
  height INT,
  mime_type TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX photos_book_id_idx ON public.photos(book_id);
CREATE INDEX photos_category_idx ON public.photos(book_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own photos" ON public.photos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS: user can access only their own folder in 'photos' bucket
-- Path convention: {user_id}/{book_id}/{uuid}.{ext}
CREATE POLICY "Users view own photo files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own photo files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own photo files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own photo files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
