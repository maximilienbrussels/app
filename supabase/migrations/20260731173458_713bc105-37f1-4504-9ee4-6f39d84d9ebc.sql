ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS diersoort_naam_fr text,
  ADD COLUMN IF NOT EXISTS diersoort_naam_en text,
  ADD COLUMN IF NOT EXISTS beschrijving_fr text,
  ADD COLUMN IF NOT EXISTS beschrijving_en text;

ALTER TABLE public.academy_vragen
  ADD COLUMN IF NOT EXISTS vraag_tekst_fr text,
  ADD COLUMN IF NOT EXISTS vraag_tekst_en text,
  ADD COLUMN IF NOT EXISTS opties_fr jsonb,
  ADD COLUMN IF NOT EXISTS opties_en jsonb;

GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Public read media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team uploads media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team updates media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team deletes media buckets" ON storage.objects;

CREATE POLICY "Public read media buckets" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('logos', 'animal-media', 'site-assets'));
CREATE POLICY "Team uploads media buckets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('logos', 'animal-media', 'site-assets') AND public.is_team_member(auth.uid()));
CREATE POLICY "Team updates media buckets" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('logos', 'animal-media', 'site-assets') AND public.is_team_member(auth.uid()))
WITH CHECK (bucket_id IN ('logos', 'animal-media', 'site-assets') AND public.is_team_member(auth.uid()));
CREATE POLICY "Team deletes media buckets" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('logos', 'animal-media', 'site-assets') AND public.is_team_member(auth.uid()));

CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read rights" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage rights" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      JOIN public.role_permissions rp ON rp.role = ur.role
     WHERE ur.user_id = _user_id AND p.active AND rp.permission = _permission AND rp.allowed
  )
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('super_admin','view_today',true),('super_admin','view_requests',true),('super_admin','manage_requests',true),
  ('super_admin','view_calendar',true),('super_admin','manage_calendar',true),('super_admin','view_services',true),
  ('super_admin','manage_services',true),('super_admin','view_shop',true),('super_admin','manage_products',true),
  ('super_admin','manage_orders',true),('super_admin','view_team',true),('super_admin','manage_team',true),
  ('super_admin','manage_rights',true),
  ('admin','view_today',true),('admin','view_requests',true),('admin','manage_requests',true),
  ('admin','view_calendar',true),('admin','manage_calendar',true),('admin','view_services',true),
  ('admin','manage_services',true),('admin','view_shop',true),('admin','manage_products',true),
  ('admin','manage_orders',true),('admin','view_team',true),('admin','manage_team',true),
  ('admin','manage_rights',true),
  ('staff','view_today',true),('staff','view_requests',true),('staff','manage_requests',true),
  ('staff','view_calendar',true),('staff','manage_calendar',true),('staff','view_services',true),
  ('staff','manage_services',false),('staff','view_shop',true),('staff','manage_products',false),
  ('staff','manage_orders',true),('staff','view_team',false),('staff','manage_team',false),
  ('staff','manage_rights',false),
  ('team','view_today',true),('team','view_requests',true),('team','manage_requests',false),
  ('team','view_calendar',true),('team','manage_calendar',false),('team','view_services',true),
  ('team','manage_services',false),('team','view_shop',false),('team','manage_products',false),
  ('team','manage_orders',false),('team','view_team',false),('team','manage_team',false),
  ('team','manage_rights',false);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id integer NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON public.order_status_history(order_id, created_at DESC);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read order history" ON public.order_status_history FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Order managers can log changes" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_orders') AND changed_by = auth.uid());

CREATE TABLE public.order_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  email text,
  phone text,
  notify_email boolean NOT NULL DEFAULT true,
  notify_sms boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_notification_recipients TO authenticated;
GRANT ALL ON public.order_notification_recipients TO service_role;
ALTER TABLE public.order_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can read order recipients" ON public.order_notification_recipients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Order managers manage recipients" ON public.order_notification_recipients FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_orders')) WITH CHECK (public.has_permission(auth.uid(), 'manage_orders'));
CREATE TRIGGER order_recipients_touch BEFORE UPDATE ON public.order_notification_recipients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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
CREATE POLICY "Admins beheren de whitelist" ON public.allowed_emails FOR ALL TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));
CREATE TRIGGER allowed_emails_touch BEFORE UPDATE ON public.allowed_emails
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.allowed_emails (email, role, note)
VALUES ('jona@delplanche.com', 'admin', 'Master admin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

CREATE OR REPLACE FUNCTION public.access_role_for_email(_email text)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN lower(coalesce(_email, '')) = public.master_admin_email() THEN 'admin'::public.app_role
    WHEN lower(split_part(coalesce(_email, ''), '@', 2)) = 'maximilien.brussels' THEN 'staff'::public.app_role
    ELSE (SELECT ae.role FROM public.allowed_emails ae WHERE ae.email = lower(coalesce(_email, '')))
  END
$$;
REVOKE ALL ON FUNCTION public.access_role_for_email(text) FROM PUBLIC, anon, authenticated;

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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(_role, 'team'::public.app_role))
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Admins beheren producten insert" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_active_admin(auth.uid()));
CREATE POLICY "Admins beheren producten update" ON public.products
  FOR UPDATE TO authenticated USING (public.is_active_admin(auth.uid()))
  WITH CHECK (public.is_active_admin(auth.uid()));
CREATE POLICY "Admins beheren producten delete" ON public.products
  FOR DELETE TO authenticated USING (public.is_active_admin(auth.uid()));
CREATE POLICY "Team leest bestellingen" ON public.orders
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins werken bestellingen bij" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_active_admin(auth.uid()))
  WITH CHECK (public.is_active_admin(auth.uid()));
CREATE POLICY "Team leest bestellijnen" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

INSERT INTO public.order_notification_recipients (label, email, phone, notify_email, notify_sms, active) VALUES
  ('Hoevewinkel', 'winkel@maximilien.brussels', '+32 2 201 56 09', true, false, true),
  ('Coördinatie', 'coordinatie@maximilien.brussels', '+32 478 11 22 33', true, true, true);