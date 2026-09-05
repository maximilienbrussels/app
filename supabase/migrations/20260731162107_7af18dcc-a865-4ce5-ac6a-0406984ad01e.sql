ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS diersoort_naam_fr text,
  ADD COLUMN IF NOT EXISTS diersoort_naam_en text,
  ADD COLUMN IF NOT EXISTS beschrijving_fr text,
  ADD COLUMN IF NOT EXISTS beschrijving_en text;

ALTER TABLE public.academy_vragen
  ADD COLUMN IF NOT EXISTS vraag_tekst_fr text,
  ADD COLUMN IF NOT EXISTS vraag_tekst_en text,
  ADD COLUMN IF NOT EXISTS opties_fr jsonb,
  ADD COLUMN IF NOT EXISTS opties_en jsonb;

GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Public read media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team uploads media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team updates media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team deletes media buckets" ON storage.objects;

CREATE POLICY "Public read media buckets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('logos', 'animal-media', 'site-assets'));

CREATE POLICY "Team uploads media buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('logos', 'animal-media', 'site-assets')
  AND public.is_team_member(auth.uid())
);

CREATE POLICY "Team updates media buckets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('logos', 'animal-media', 'site-assets')
  AND public.is_team_member(auth.uid())
)
WITH CHECK (
  bucket_id IN ('logos', 'animal-media', 'site-assets')
  AND public.is_team_member(auth.uid())
);

CREATE POLICY "Team deletes media buckets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('logos', 'animal-media', 'site-assets')
  AND public.is_team_member(auth.uid())
);