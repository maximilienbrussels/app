DO $$
DECLARE r record;
BEGIN
  EXECUTE 'GRANT sandbox_exec TO ' || quote_ident(current_user);
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = 'sandbox_exec' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', r.tablename, current_user);
  END LOOP;
END $$;