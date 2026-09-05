-- 1. Passkey credentials
CREATE TABLE public.webauthn_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_name text,
  backed_up boolean NOT NULL DEFAULT false,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own passkeys"
  ON public.webauthn_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passkeys"
  ON public.webauthn_credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX webauthn_credentials_user_id_idx ON public.webauthn_credentials (user_id);

CREATE TRIGGER webauthn_credentials_touch
  BEFORE UPDATE ON public.webauthn_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Short-lived challenges (server-only)
CREATE TABLE public.webauthn_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  user_id uuid,
  challenge text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.webauthn_challenges TO service_role;

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE INDEX webauthn_challenges_lookup_idx ON public.webauthn_challenges (purpose, email);

-- 3. Split names on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

UPDATE public.profiles
   SET first_name = NULLIF(split_part(trim(coalesce(full_name, '')), ' ', 1), ''),
       last_name = NULLIF(trim(substring(trim(coalesce(full_name, '')) from position(' ' in trim(coalesce(full_name, ''))) + 1)), '')
 WHERE full_name IS NOT NULL AND trim(full_name) <> '';

UPDATE public.profiles
   SET last_name = NULL
 WHERE last_name IS NOT NULL AND last_name = first_name;

CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := NULLIF(trim(concat_ws(' ', NULLIF(trim(coalesce(NEW.first_name, '')), ''), NULLIF(trim(coalesce(NEW.last_name, '')), ''))), '');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_sync_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_full_name();