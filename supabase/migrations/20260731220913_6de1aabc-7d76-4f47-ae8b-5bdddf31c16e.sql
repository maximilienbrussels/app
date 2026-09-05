-- Academy: modules, media, wist-je-datjes, categorieën
ALTER TABLE public.academy_vragen
  ADD COLUMN IF NOT EXISTS module smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vraag_type text NOT NULL DEFAULT 'tekst',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_alt text,
  ADD COLUMN IF NOT EXISTS wist_je_dat text,
  ADD COLUMN IF NOT EXISTS wist_je_dat_fr text,
  ADD COLUMN IF NOT EXISTS wist_je_dat_en text;

ALTER TABLE public.academy_vragen DROP CONSTRAINT IF EXISTS academy_vragen_vraag_type_check;
ALTER TABLE public.academy_vragen ADD CONSTRAINT academy_vragen_vraag_type_check CHECK (vraag_type IN ('tekst','beeld','audio'));
ALTER TABLE public.academy_vragen DROP CONSTRAINT IF EXISTS academy_vragen_module_check;
ALTER TABLE public.academy_vragen ADD CONSTRAINT academy_vragen_module_check CHECK (module BETWEEN 1 AND 3);

ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS categorie text NOT NULL DEFAULT 'boerderij',
  ADD COLUMN IF NOT EXISTS prioriteit integer NOT NULL DEFAULT 100;

UPDATE public.academies SET categorie='knaagdieren', prioriteit=10 WHERE slug='konijn';
UPDATE public.academies SET categorie='boerderij', prioriteit=20 WHERE slug='kip';
UPDATE public.academies SET categorie='boerderij', prioriteit=30 WHERE slug='geit';

-- Mailserverinstellingen: alleen server-side leesbaar (bevat een wachtwoord)
CREATE TABLE public.smtp_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  host text,
  port integer,
  username text,
  password text,
  from_address text,
  from_name text,
  secure boolean,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.smtp_config TO service_role;
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alleen serverzijde toegang tot mailserverinstellingen"
  ON public.smtp_config FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE TRIGGER smtp_config_touch BEFORE UPDATE ON public.smtp_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.smtp_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Logboek van verzendpogingen
CREATE TABLE public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  recipient_masked text NOT NULL,
  subject text,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_code text,
  error_message text,
  duration_ms integer,
  smtp_host text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_events_created_at_idx ON public.email_events (created_at DESC);
GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Beheerders lezen het maillogboek"
  ON public.email_events FOR SELECT TO authenticated
  USING (public.is_active_admin(auth.uid()));

-- Kolomniveau-beperking op organisations
REVOKE SELECT ON public.organisations FROM anon;
REVOKE SELECT ON public.organisations FROM authenticated;
GRANT SELECT (id, name, street, house_number, postal_code, city, country) ON public.organisations TO anon;
GRANT SELECT (id, name, street, house_number, postal_code, city, country) ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;

-- Zelf-update van profielen beperken
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.id THEN
    RETURN NEW;
  END IF;
  IF public.is_active_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.active := OLD.active;
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

-- Strengere rolcontroles
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

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE p.id = ur.user_id
  AND ur.role = 'team'::public.app_role
  AND p.active IS NOT TRUE;

-- Interne SECURITY DEFINER functies afschermen
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.access_role_for_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_master_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_full_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.master_admin_email() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.access_role_for_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.master_admin_email() TO service_role;