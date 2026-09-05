CREATE TABLE public.allowed_emails (
  email text PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'staff',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_emails TO authenticated;
GRANT ALL ON public.allowed_emails TO service_role;

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins beheren de whitelist"
  ON public.allowed_emails FOR ALL TO authenticated
  USING (public.is_active_admin(auth.uid()))
  WITH CHECK (public.is_active_admin(auth.uid()));

CREATE TRIGGER allowed_emails_touch
  BEFORE UPDATE ON public.allowed_emails
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.allowed_emails (email, role, note)
VALUES ('jona@delplanche.com', 'admin', 'Master admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

CREATE OR REPLACE FUNCTION public.access_role_for_email(_email text)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(_email, '')) = public.master_admin_email() THEN 'admin'::public.app_role
    WHEN lower(split_part(coalesce(_email, ''), '@', 2)) = 'maximilien.brussels' THEN 'staff'::public.app_role
    ELSE (SELECT ae.role FROM public.allowed_emails ae WHERE ae.email = lower(coalesce(_email, '')))
  END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(_role, 'team'::public.app_role))
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

UPDATE public.profiles SET active = true WHERE lower(email) = public.master_admin_email();

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role FROM public.profiles p
WHERE lower(p.email) = public.master_admin_email()
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND lower(p.email) = public.master_admin_email()
  AND ur.role <> 'admin';

REVOKE EXECUTE ON FUNCTION public.access_role_for_email(text) FROM PUBLIC, anon, authenticated;