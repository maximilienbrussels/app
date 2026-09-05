DROP FUNCTION IF EXISTS public.__import_exec(text);
REVOKE ALL ON SCHEMA auth FROM sandbox_exec;
ALTER ROLE sandbox_exec NOCREATEROLE;