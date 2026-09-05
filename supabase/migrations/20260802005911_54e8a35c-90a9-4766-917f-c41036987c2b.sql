ALTER TABLE public.academy_vragen
  ADD COLUMN IF NOT EXISTS doelgroep text NOT NULL DEFAULT 'beide';

ALTER TABLE public.academy_vragen
  DROP CONSTRAINT IF EXISTS academy_vragen_doelgroep_check;

ALTER TABLE public.academy_vragen
  ADD CONSTRAINT academy_vragen_doelgroep_check
  CHECK (doelgroep IN ('kids', '16plus', 'beide'));

CREATE INDEX IF NOT EXISTS academy_vragen_doelgroep_idx
  ON public.academy_vragen (academy_id, doelgroep);