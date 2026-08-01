
CREATE POLICY "Authenticated users can upload their own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Authenticated users can update avatars they own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = 'avatars' AND owner = auth.uid());

CREATE POLICY "Authenticated users can delete avatars they own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = 'avatars' AND owner = auth.uid());
