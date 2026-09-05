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
