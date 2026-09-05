ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS required_level smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_availability_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_availability_check
      CHECK (availability IN ('available', 'coming_soon', 'out_of_stock'));
  END IF;
END $$;