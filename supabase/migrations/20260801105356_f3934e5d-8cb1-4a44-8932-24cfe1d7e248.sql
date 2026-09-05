CREATE OR REPLACE FUNCTION _import.exec_ignore(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  EXECUTE sql;
  RETURN 'ok';
EXCEPTION
  WHEN duplicate_table OR duplicate_object OR duplicate_function OR duplicate_column OR duplicate_schema THEN
    RETURN 'skipped';
  WHEN OTHERS THEN
    RETURN 'error: ' || SQLERRM;
END;
$fn$;
REVOKE ALL ON FUNCTION _import.exec_ignore(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION _import.exec_ignore(text) TO sandbox_exec;