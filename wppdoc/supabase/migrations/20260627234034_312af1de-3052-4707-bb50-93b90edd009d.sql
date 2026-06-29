
CREATE POLICY "Anyone can upload contracts" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'contracts');
CREATE POLICY "Anyone can read contracts" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'contracts');
