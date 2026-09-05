CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  message text NOT NULL,
  error_name text,
  stack text,
  route text,
  boundary text,
  user_agent text,
  viewport text,
  language text,
  app_version text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported boolean NOT NULL DEFAULT false,
  contact_name text,
  contact_email text,
  contact_note text,
  resolved boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS client_errors_created_at_idx ON public.client_errors (created_at DESC);

GRANT SELECT, UPDATE ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read client errors" ON public.client_errors;
CREATE POLICY "Staff can read client errors"
  ON public.client_errors FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update client errors" ON public.client_errors;
CREATE POLICY "Staff can update client errors"
  ON public.client_errors FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));