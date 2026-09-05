-- 1. is_staff: expliciete rolcontrole + alleen over jezelf
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND p.active
      AND ur.role IN ('super_admin'::public.app_role, 'admin'::public.app_role, 'staff'::public.app_role, 'team'::public.app_role)
      AND (auth.uid() IS NULL OR _user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.user_roles ur2
        JOIN public.profiles p2 ON p2.id = ur2.user_id
        WHERE ur2.user_id = auth.uid() AND p2.active
          AND ur2.role IN ('super_admin'::public.app_role, 'admin'::public.app_role, 'staff'::public.app_role, 'team'::public.app_role)
      ))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND p.active AND ur.role = 'admin'::public.app_role
      AND (auth.uid() IS NULL OR _user_id = auth.uid() OR public.is_staff(auth.uid()))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      JOIN public.role_permissions rp ON rp.role = ur.role
     WHERE ur.user_id = _user_id AND p.active AND rp.permission = _permission AND rp.allowed
       AND (auth.uid() IS NULL OR _user_id = auth.uid())
  )
$$;

-- 2. Nieuwe registraties krijgen enkel een rol wanneer ze op de lijst staan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text := lower(coalesce(NEW.email, ''));
  _role public.app_role := public.access_role_for_email(_email);
  _allowed boolean := _role IS NOT NULL;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'avatar_url',
    _allowed
  )
  ON CONFLICT (id) DO NOTHING;

  IF _allowed THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- 3. Opruimen: onterechte teamrollen bij niet-actieve klantprofielen
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE p.id = ur.user_id
  AND ur.role = 'team'::public.app_role
  AND p.active IS NOT TRUE;

-- 4. Interne SECURITY DEFINER functies niet oproepbaar door ingelogde gebruikers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.access_role_for_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_master_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_master_admin_role() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.access_role_for_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_master_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_profile_self_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_master_admin_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_master_admin_role() TO service_role;
