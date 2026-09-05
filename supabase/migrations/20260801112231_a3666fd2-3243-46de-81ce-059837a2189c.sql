DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Public read media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team uploads media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team updates media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team deletes media buckets" ON storage.objects;

CREATE POLICY "Public read media buckets" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('logos','animal-media','site-assets'));
CREATE POLICY "Team uploads media buckets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()));
CREATE POLICY "Team updates media buckets" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()));
CREATE POLICY "Team deletes media buckets" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()));

DO $$
DECLARE r record; fk text;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      AND a.atttypid = 'uuid'::regtype
      AND (a.attname IN ('user_id','created_by','updated_by','actor_id','assigned_to','uploaded_by','changed_by','owner_id')
           OR (a.attname = 'id' AND c.relname = 'profiles'))
  LOOP
    fk := 'fk_' || r.tbl || '_' || r.col || '_users';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE', r.tbl, fk, r.col);
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'skip % %: %', r.tbl, r.col, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;