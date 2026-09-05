ALTER TABLE public.academy_vragen
  ADD COLUMN IF NOT EXISTS module smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vraag_type text NOT NULL DEFAULT 'tekst',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_alt text,
  ADD COLUMN IF NOT EXISTS wist_je_dat text,
  ADD COLUMN IF NOT EXISTS wist_je_dat_fr text,
  ADD COLUMN IF NOT EXISTS wist_je_dat_en text;

ALTER TABLE public.academy_vragen
  DROP CONSTRAINT IF EXISTS academy_vragen_vraag_type_check;
ALTER TABLE public.academy_vragen
  ADD CONSTRAINT academy_vragen_vraag_type_check CHECK (vraag_type IN ('tekst','beeld','audio'));
ALTER TABLE public.academy_vragen
  DROP CONSTRAINT IF EXISTS academy_vragen_module_check;
ALTER TABLE public.academy_vragen
  ADD CONSTRAINT academy_vragen_module_check CHECK (module BETWEEN 1 AND 3);