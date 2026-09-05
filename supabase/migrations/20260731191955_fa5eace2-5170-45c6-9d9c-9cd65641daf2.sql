DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'importer_tmp') THEN
    CREATE ROLE importer_tmp;
  END IF;
END $$;
GRANT importer_tmp TO sandbox_exec WITH ADMIN OPTION;
GRANT CREATE, USAGE ON SCHEMA public TO importer_tmp;
GRANT USAGE ON SCHEMA auth TO importer_tmp;
GRANT SELECT ON auth.users TO importer_tmp;
GRANT anon, authenticated, service_role TO importer_tmp;