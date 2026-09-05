-- 1. Organisations: hide sensitive contact/banking columns from public API roles
REVOKE SELECT ON public.organisations FROM anon, authenticated;
GRANT SELECT (id, name, slug, street, house_number, postal_code, city, country, vision, lat, lon, created_at)
  ON public.organisations TO anon, authenticated;
GRANT ALL ON public.organisations TO service_role;

-- 2. Animals: hide internal persona_prompt from public API roles
REVOKE SELECT ON public.animals FROM anon, authenticated;
GRANT SELECT (id, organisation_id, name, species, description, image_url, qr_hash, created_at)
  ON public.animals TO anon, authenticated;
GRANT ALL ON public.animals TO service_role;

-- 3. Certificate RPC: recompute score server-side from stored answers
DROP FUNCTION IF EXISTS public.geef_certificaat_uit(uuid, text, text);

CREATE OR REPLACE FUNCTION public.geef_certificaat_uit(
  _academy_id uuid,
  _antwoorden jsonb,
  _volledige_naam text
)
RETURNS public.certificaten
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _next integer;
  _cert public.certificaten;
  _slug text;
  _grens integer;
  _correct integer := 0;
  _totaal integer := 0;
  _score text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF _volledige_naam IS NULL OR length(trim(_volledige_naam)) = 0 OR length(_volledige_naam) > 120 THEN
    RAISE EXCEPTION 'Ongeldige naam';
  END IF;
  IF jsonb_typeof(_antwoorden) <> 'array' THEN RAISE EXCEPTION 'Ongeldige antwoorden'; END IF;

  SELECT slug, slaag_grens INTO _slug, _grens FROM public.academies WHERE id = _academy_id;
  IF _slug IS NULL THEN RAISE EXCEPTION 'Academy bestaat niet'; END IF;

  SELECT count(*)::int,
         count(*) FILTER (WHERE v.correcte_optie_index = (a->>'gekozen_index')::int)::int
    INTO _totaal, _correct
    FROM jsonb_array_elements(_antwoorden) a
    JOIN public.academy_vragen v
      ON v.id = (a->>'vraag_id')::uuid
     AND v.academy_id = _academy_id;

  IF _totaal = 0 THEN RAISE EXCEPTION 'Geen geldige antwoorden'; END IF;
  IF _correct < _grens THEN RAISE EXCEPTION 'Onvoldoende score voor een certificaat'; END IF;

  _score := _correct::text || '/' || _totaal::text;

  SELECT COALESCE(MAX(volgnummer), 0) + 1 INTO _next FROM public.certificaten WHERE academy_id = _academy_id;
  INSERT INTO public.certificaten (user_id, academy_id, volgnummer, score, volledige_naam)
    VALUES (_user_id, _academy_id, _next, _score, trim(_volledige_naam)) RETURNING * INTO _cert;

  UPDATE public.profiles SET behaalde_badges =
    CASE WHEN behaalde_badges @> to_jsonb(_slug) THEN behaalde_badges
         ELSE behaalde_badges || to_jsonb(_slug) END
    WHERE id = _user_id;

  RETURN _cert;
END;
$$;

REVOKE ALL ON FUNCTION public.geef_certificaat_uit(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.geef_certificaat_uit(uuid, jsonb, text) TO authenticated, service_role;

-- 4. Lock down internal SECURITY DEFINER helpers from direct API execution
REVOKE ALL ON FUNCTION public.access_role_for_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.master_admin_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_master_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_master_admin_role() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.access_role_for_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO service_role;