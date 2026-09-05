ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'gepubliceerd',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS review_requested_by uuid,
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.academies
  ADD CONSTRAINT academies_status_check
  CHECK (status IN ('concept', 'wacht_op_goedkeuring', 'gepubliceerd'));

CREATE TABLE IF NOT EXISTS public.academy_publish_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  requester_email text,
  note text,
  status text NOT NULL DEFAULT 'open',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_publish_requests_status_check CHECK (status IN ('open', 'goedgekeurd', 'afgewezen'))
);

GRANT SELECT, INSERT, UPDATE ON public.academy_publish_requests TO authenticated;
GRANT ALL ON public.academy_publish_requests TO service_role;
ALTER TABLE public.academy_publish_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team leest publicatieverzoeken"
  ON public.academy_publish_requests FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_academy'));

CREATE POLICY "Team maakt publicatieverzoeken"
  ON public.academy_publish_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_academy') AND requested_by = auth.uid());

CREATE POLICY "Verantwoordelijke beslist over publicatieverzoeken"
  ON public.academy_publish_requests FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'publish_academy'))
  WITH CHECK (public.has_permission(auth.uid(), 'publish_academy'));

CREATE TRIGGER touch_academy_publish_requests
  BEFORE UPDATE ON public.academy_publish_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.role_permissions (role, permission, allowed) VALUES
  ('super_admin', 'view_academy', true),
  ('super_admin', 'manage_academy', true),
  ('super_admin', 'publish_academy', true),
  ('admin', 'view_academy', true),
  ('admin', 'manage_academy', true),
  ('admin', 'publish_academy', true),
  ('staff', 'view_academy', true),
  ('staff', 'manage_academy', true),
  ('staff', 'publish_academy', false),
  ('team', 'view_academy', true),
  ('team', 'manage_academy', false),
  ('team', 'publish_academy', false)
ON CONFLICT (role, permission) DO NOTHING;

DROP POLICY IF EXISTS "Academies zijn publiek leesbaar" ON public.academies;
CREATE POLICY "Gepubliceerde academies zijn publiek leesbaar"
  ON public.academies FOR SELECT
  USING (is_active AND status = 'gepubliceerd');
CREATE POLICY "Team leest alle academies"
  ON public.academies FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_academy'));

DROP POLICY IF EXISTS "Vragen zijn publiek leesbaar" ON public.academy_vragen;
CREATE POLICY "Vragen van gepubliceerde academies zijn publiek leesbaar"
  ON public.academy_vragen FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.academies a
     WHERE a.id = academy_id AND a.is_active AND a.status = 'gepubliceerd'
  ));
CREATE POLICY "Team leest alle vragen"
  ON public.academy_vragen FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'view_academy'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_vragen TO authenticated;
GRANT ALL ON public.academies TO service_role;
GRANT ALL ON public.academy_vragen TO service_role;

CREATE POLICY "Team maakt academies"
  ON public.academies FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_academy')
    AND (status <> 'gepubliceerd' OR public.has_permission(auth.uid(), 'publish_academy')));

CREATE POLICY "Team beheert academies"
  ON public.academies FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_academy'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_academy')
    AND (status <> 'gepubliceerd' OR public.has_permission(auth.uid(), 'publish_academy')));

CREATE POLICY "Publicatieverantwoordelijke verwijdert academies"
  ON public.academies FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'publish_academy'));

CREATE POLICY "Team beheert vragen"
  ON public.academy_vragen FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_academy'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_academy'));