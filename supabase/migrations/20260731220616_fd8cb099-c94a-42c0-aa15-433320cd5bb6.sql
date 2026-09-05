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

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      JOIN public.role_permissions rp ON rp.role = ur.role
     WHERE ur.user_id = _user_id
       AND p.active
       AND rp.permission = _permission
       AND rp.allowed
  )
$$;

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
CREATE POLICY "Order managers can log changes" ON public.order_status_history FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'manage_orders') AND changed_by = auth.uid());

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
CREATE POLICY "Order managers manage recipients" ON public.order_notification_recipients FOR ALL TO authenticated USING (public.has_permission(auth.uid(), 'manage_orders')) WITH CHECK (public.has_permission(auth.uid(), 'manage_orders'));
CREATE TRIGGER order_recipients_touch BEFORE UPDATE ON public.order_notification_recipients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();