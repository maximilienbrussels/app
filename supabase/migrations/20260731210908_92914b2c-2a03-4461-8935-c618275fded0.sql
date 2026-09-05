-- 1. Organisations: hide financial/contact columns from anon + authenticated
REVOKE SELECT ON public.organisations FROM anon;
REVOKE SELECT ON public.organisations FROM authenticated;
GRANT SELECT (id, name, street, house_number, postal_code, city, country, vision, lat, lon) ON public.organisations TO anon;
GRANT SELECT (id, name, street, house_number, postal_code, city, country, vision, lat, lon) ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;

-- 2. Profiles: restrict which columns a user may change on their own row
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / internal (SECURITY DEFINER) paths have no auth.uid() claim.
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.id THEN
    RETURN NEW;
  END IF;

  -- Admins may change everything (also on their own row).
  IF public.is_active_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Privileged columns are frozen for self-service updates.
  NEW.active := OLD.active;
  NEW.role := OLD.role;
  NEW.hoefjes_balance := OLD.hoefjes_balance;
  NEW.behaalde_badges := OLD.behaalde_badges;
  NEW.email := OLD.email;
  NEW.id := OLD.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_self_update ON public.profiles;
CREATE TRIGGER guard_profile_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_update();

REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM PUBLIC, anon, authenticated;

-- 3. Internal SECURITY DEFINER functions must not be callable through the API
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_master_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_full_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.access_role_for_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.master_admin_email() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.access_role_for_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.master_admin_email() TO service_role;