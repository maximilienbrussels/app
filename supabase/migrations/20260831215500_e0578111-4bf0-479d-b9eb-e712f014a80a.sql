GRANT ALL ON SCHEMA public TO sandbox_exec;
GRANT USAGE ON SCHEMA auth TO sandbox_exec;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO sandbox_exec;
GRANT anon TO sandbox_exec WITH ADMIN OPTION;
GRANT authenticated TO sandbox_exec WITH ADMIN OPTION;
GRANT service_role TO sandbox_exec WITH ADMIN OPTION;
ALTER ROLE sandbox_exec CREATEROLE;
