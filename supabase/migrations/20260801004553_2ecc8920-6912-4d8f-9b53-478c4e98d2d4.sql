DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','v','m','p')
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.relname);
    IF EXISTS (
      SELECT 1 FROM pg_policy p
      WHERE p.polrelid = r.oid AND p.polcmd IN ('r','*') AND p.polpermissive
        AND (p.polroles = '{0}'::oid[] OR 'anon'::regrole = ANY(p.polroles))
    ) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', r.relname);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind='S'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated, service_role', r.relname);
  END LOOP;
END $$;