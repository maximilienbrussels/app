ALTER TABLE public.academies ADD COLUMN IF NOT EXISTS korte_code integer;

CREATE SEQUENCE IF NOT EXISTS public.academies_korte_code_seq AS integer START 1;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY coalesce(prioriteit, 999), diersoort_naam) AS rn
  FROM public.academies
  WHERE korte_code IS NULL
)
UPDATE public.academies a
SET korte_code = o.rn
FROM ordered o
WHERE a.id = o.id;

SELECT setval('public.academies_korte_code_seq', GREATEST(1, (SELECT coalesce(max(korte_code), 0) FROM public.academies)));

ALTER TABLE public.academies ALTER COLUMN korte_code SET DEFAULT nextval('public.academies_korte_code_seq');

CREATE UNIQUE INDEX IF NOT EXISTS academies_korte_code_key ON public.academies (korte_code);