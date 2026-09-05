DO $$
DECLARE r text;
BEGIN
  SELECT rolname INTO r FROM pg_roles WHERE rolname LIKE 'sandbox_exec%' LIMIT 1;
  IF r IS NOT NULL THEN
    EXECUTE format('GRANT CREATE, USAGE ON SCHEMA public TO %I', r);
    EXECUTE format('GRANT USAGE ON SCHEMA auth TO %I', r);
    EXECUTE format('GRANT REFERENCES, SELECT ON auth.users TO %I', r);
    EXECUTE format('GRANT anon, authenticated, service_role TO %I WITH ADMIN OPTION', r);
    EXECUTE format('ALTER ROLE %I CREATEROLE', r);
  END IF;
END $$;