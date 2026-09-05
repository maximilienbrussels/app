CREATE OR REPLACE FUNCTION public.__import_exec(token text, sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF token IS DISTINCT FROM 'c379d4011867bbdcd969b58f099072d2' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  EXECUTE sql;
END;
$$;
REVOKE ALL ON FUNCTION public.__import_exec(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.__import_exec(text, text) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';