-- Organisations
CREATE TABLE public.organisations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  street VARCHAR(255) NOT NULL,
  house_number VARCHAR(20) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'Belgium',
  iban VARCHAR(34),
  bic VARCHAR(11),
  vision TEXT,
  lat NUMERIC(9,6),
  lon NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organisations TO anon, authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read organisations" ON public.organisations FOR SELECT USING (true);

CREATE TABLE public.operational_hours (
  id SERIAL PRIMARY KEY,
  organisation_id INT NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  audience_type VARCHAR(50) NOT NULL DEFAULT 'public'
);
CREATE INDEX ON public.operational_hours (organisation_id, day_of_week);
GRANT SELECT ON public.operational_hours TO anon, authenticated;
GRANT ALL ON public.operational_hours TO service_role;
ALTER TABLE public.operational_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hours" ON public.operational_hours FOR SELECT USING (true);

CREATE TABLE public.animals (
  id SERIAL PRIMARY KEY,
  organisation_id INT NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(512),
  persona_prompt TEXT NOT NULL,
  qr_hash VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.animals (organisation_id);
GRANT SELECT ON public.animals TO anon, authenticated;
GRANT ALL ON public.animals TO service_role;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read animals" ON public.animals FOR SELECT USING (true);

CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  organisation_id INT NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(512),
  price_cents INT NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_packaging_free BOOLEAN NOT NULL DEFAULT TRUE,
  c2c_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  c2c_refund_value_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title_nl text,
  title_fr text,
  title_en text,
  desc_nl text,
  desc_fr text,
  desc_en text,
  is_catalog boolean NOT NULL DEFAULT true
);
CREATE INDEX ON public.products (organisation_id);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.products FOR SELECT USING (true);

CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  organisation_id INT NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  structured_communication VARCHAR(30) UNIQUE NOT NULL,
  total_price_cents INT NOT NULL,
  pickup_slot TIMESTAMPTZ NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  customer_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES public.products(id),
  quantity INT NOT NULL,
  price_at_purchase_cents INT NOT NULL
);
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no client access orders" ON public.orders
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "no client access order_items" ON public.order_items
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'super_admin', 'team');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  behaalde_badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  phone text,
  street text,
  postal_code text,
  city text,
  notify_orders boolean NOT NULL DEFAULT true,
  notify_academy boolean NOT NULL DEFAULT true,
  notify_newsletter boolean NOT NULL DEFAULT false,
  hoefjes_balance integer NOT NULL DEFAULT 0,
  role text,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.animals FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.animals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE animals_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE operational_hours_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE order_items_id_seq TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diersoort_naam text NOT NULL,
  slug text NOT NULL UNIQUE,
  badge_icon text NOT NULL DEFAULT 'PawPrint',
  vragen_per_test integer NOT NULL DEFAULT 5 CHECK (vragen_per_test > 0),
  slaag_grens integer NOT NULL DEFAULT 4 CHECK (slaag_grens > 0),
  beschrijving text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academies TO authenticated;
GRANT ALL ON public.academies TO service_role;
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Academies zijn publiek leesbaar" ON public.academies FOR SELECT USING (true);
CREATE TRIGGER update_academies_updated_at BEFORE UPDATE ON public.academies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.academy_vragen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  vraag_tekst text NOT NULL,
  opties jsonb NOT NULL,
  correcte_optie_index integer NOT NULL CHECK (correcte_optie_index >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academy_vragen_academy_id_idx ON public.academy_vragen(academy_id);
GRANT SELECT ON public.academy_vragen TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academy_vragen TO authenticated;
GRANT ALL ON public.academy_vragen TO service_role;
ALTER TABLE public.academy_vragen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vragen zijn publiek leesbaar" ON public.academy_vragen FOR SELECT USING (true);
CREATE TRIGGER update_academy_vragen_updated_at BEFORE UPDATE ON public.academy_vragen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.certificaten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id uuid NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  volgnummer integer NOT NULL,
  score text NOT NULL,
  volledige_naam text,
  behaald_op timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(academy_id, volgnummer)
);
CREATE INDEX certificaten_user_id_idx ON public.certificaten(user_id);
CREATE INDEX certificaten_academy_id_idx ON public.certificaten(academy_id);
GRANT SELECT ON public.certificaten TO authenticated;
GRANT ALL ON public.certificaten TO service_role;
ALTER TABLE public.certificaten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gebruikers zien eigen certificaten" ON public.certificaten FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins zien alle certificaten" ON public.certificaten FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.geef_certificaat_uit(
  _academy_id uuid,
  _score text,
  _volledige_naam text
) RETURNS public.certificaten
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _next integer;
  _cert public.certificaten;
  _slug text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  SELECT slug INTO _slug FROM public.academies WHERE id = _academy_id;
  IF _slug IS NULL THEN RAISE EXCEPTION 'Academy bestaat niet'; END IF;
  SELECT COALESCE(MAX(volgnummer), 0) + 1 INTO _next FROM public.certificaten WHERE academy_id = _academy_id;
  INSERT INTO public.certificaten (user_id, academy_id, volgnummer, score, volledige_naam)
    VALUES (_user_id, _academy_id, _next, _score, _volledige_naam) RETURNING * INTO _cert;
  UPDATE public.profiles SET behaalde_badges =
    CASE WHEN behaalde_badges @> to_jsonb(_slug) THEN behaalde_badges
         ELSE behaalde_badges || to_jsonb(_slug) END
    WHERE id = _user_id;
  RETURN _cert;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.geef_certificaat_uit(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.geef_certificaat_uit(uuid, text, text) TO authenticated;

INSERT INTO public.academies (diersoort_naam, slug, badge_icon, vragen_per_test, slaag_grens, beschrijving)
VALUES
  ('Konijn', 'konijn', 'Rabbit', 5, 4, 'Alles wat je moet weten voor je een konijn adopteert.'),
  ('Geit', 'geit', 'Squirrel', 5, 4, 'De basis van geitenverzorging op de stadsboerderij.'),
  ('Kip', 'kip', 'Bird', 5, 4, 'Word expert in kippen en hun leefomgeving.')
ON CONFLICT (slug) DO NOTHING;

DO $mig$
DECLARE _konijn uuid; _geit uuid; _kip uuid;
BEGIN
  SELECT id INTO _konijn FROM public.academies WHERE slug = 'konijn';
  SELECT id INTO _geit   FROM public.academies WHERE slug = 'geit';
  SELECT id INTO _kip    FROM public.academies WHERE slug = 'kip';
  IF _konijn IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.academy_vragen WHERE academy_id = _konijn) THEN
    INSERT INTO public.academy_vragen (academy_id, vraag_tekst, opties, correcte_optie_index) VALUES
    (_konijn, 'Hoeveel uur per dag moet een konijn minimaal kunnen bewegen buiten zijn hok?', '["Minder dan 1 uur","1 tot 2 uur","Minstens 4 uur","Konijnen hoeven niet te bewegen"]'::jsonb, 2),
    (_konijn, 'Wat is het hoofdbestanddeel van een gezond konijnendieet?', '["Brokjes","Hooi","Brood","Groenten alleen"]'::jsonb, 1),
    (_konijn, 'Konijnen leven het best...', '["Alleen","Met minstens een ander konijn","Met een cavia","Met een kat"]'::jsonb, 1),
    (_konijn, 'Hoe oud kan een goed verzorgd konijn worden?', '["2 jaar","5 jaar","8 tot 12 jaar","20 jaar"]'::jsonb, 2),
    (_konijn, 'Waarom moeten konijnen regelmatig knagen?', '["Voor de smaak","Hun tanden groeien levenslang","Ze vervelen zich","Het is een spel"]'::jsonb, 1),
    (_konijn, 'Welke groente is giftig voor konijnen?', '["Wortel","Peterselie","Avocado","Andijvie"]'::jsonb, 2);
  END IF;
  IF _geit IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.academy_vragen WHERE academy_id = _geit) THEN
    INSERT INTO public.academy_vragen (academy_id, vraag_tekst, opties, correcte_optie_index) VALUES
    (_geit, 'Geiten zijn van nature...', '["Solitaire dieren","Kuddedieren","Nachtdieren","Roofdieren"]'::jsonb, 1),
    (_geit, 'Wat eten geiten hoofdzakelijk?', '["Vlees","Ruwvoer zoals hooi en bladeren","Enkel granen","Fruit"]'::jsonb, 1),
    (_geit, 'Hoeveel magen heeft een geit?', '["1","2","4","6"]'::jsonb, 2),
    (_geit, 'Wat is essentieel in het onderkomen van een geit?', '["Volledig gesloten stal","Droge ligplaats en beschutting","Aquarium","Kattenbak"]'::jsonb, 1),
    (_geit, 'Hoe vaak moeten geitenhoeven bekapt worden?', '["Nooit","Elke week","Elke 6 tot 8 weken","Een keer per jaar"]'::jsonb, 2),
    (_geit, 'Welke plant is giftig voor geiten?', '["Braamstruik","Taxus","Klaver","Wilg"]'::jsonb, 1);
  END IF;
  IF _kip IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.academy_vragen WHERE academy_id = _kip) THEN
    INSERT INTO public.academy_vragen (academy_id, vraag_tekst, opties, correcte_optie_index) VALUES
    (_kip, 'Hoeveel kippen hou je best minimaal samen?', '["Een","Twee of meer","Tien","Twintig"]'::jsonb, 1),
    (_kip, 'Wat mogen kippen NIET eten?', '["Graan","Groenteresten","Rauwe aardappelschillen","Wormen"]'::jsonb, 2),
    (_kip, 'Wat is een stofbad voor kippen?', '["Een decoratie","Manier om parasieten te weren","Drinken","Speelgoed"]'::jsonb, 1),
    (_kip, 'Hoeveel eieren legt een gezonde leghen ongeveer per jaar?', '["10","50","200 tot 300","1000"]'::jsonb, 2),
    (_kip, 'Wat is een essentieel onderdeel van het hok?', '["TV","Zitstok","Trap","Zwembad"]'::jsonb, 1),
    (_kip, 'Waarom hebben kippen grit nodig?', '["Voor de smaak","Om voedsel te vermalen in de spiermaag","Als speelgoed","Als bed"]'::jsonb, 1);
  END IF;
END $mig$;

REVOKE SELECT ON public.organisations FROM anon;
GRANT SELECT (id, name, street, house_number, postal_code, city, country, vision, lat, lon)
  ON public.organisations TO anon;
REVOKE SELECT ON public.organisations FROM authenticated;
GRANT SELECT (id, name, street, house_number, postal_code, city, country, vision, lat, lon)
  ON public.organisations TO authenticated;

INSERT INTO public.organisations (id, name, slug, email, phone, street, house_number, postal_code, city, country, iban, bic, lat, lon, vision)
VALUES (1, 'La Ferme du parc Maximilien', 'ferme-maximilien', 'info@fermeduparcmaximilien.be', '+32 2 201 56 09', 'Quai de la Batelage', '2', '1000', 'Bruxelles', 'Belgium', 'BE68 5390 0754 7034', 'BBRUBEBB', 50.8597, 4.3483, 'Ferme d''animation urbaine et espace de cohesion sociale au coeur de Bruxelles.');
SELECT setval('organisations_id_seq', (SELECT MAX(id) FROM public.organisations));

INSERT INTO public.operational_hours (organisation_id, day_of_week, open_time, close_time, audience_type) VALUES
 (1, 2, '10:00', '17:00', 'public'),
 (1, 3, '10:00', '17:00', 'public'),
 (1, 4, '10:00', '17:00', 'public'),
 (1, 5, '10:00', '17:00', 'public'),
 (1, 6, '12:00', '18:00', 'public'),
 (1, 0, '12:00', '18:00', 'public');

INSERT INTO public.animals (id, organisation_id, name, species, description, persona_prompt, qr_hash) VALUES
 (1, 1, 'Boudewijn', 'Ezel', 'Onze rustige ezel, houdt van wortelen en lange gesprekken bij de omheining.', 'Je bent Boudewijn, een wijze en rustige ezel van de Ferme du parc Maximilien. Spreek in de eerste persoon, warm en licht humoristisch.', 'a1b2c3'),
 (2, 1, 'Margot', 'Geit', 'Nieuwsgierige geit, altijd op zoek naar avontuur bij de hooiruif.', 'Je bent Margot, een speelse en nieuwsgierige geit. Antwoord kort, energiek, in de eerste persoon.', 'd4e5f6'),
 (3, 1, 'Pino', 'Konijn', 'Tamme dwergkonijn, verzorgd door de vrijwilligers van de Rabbit Academy.', 'Je bent Pino, een tam konijn. Vertel over konijnenwelzijn in stedelijke omgevingen.', 'g7h8i9'),
 (4, 1, 'Zoe', 'Bij', 'Werkbij van de daktuinkast, verantwoordelijk voor de lokale bestuiving.', 'Je bent Zoe, een werkbij van de stadsimkerij. Spreek namens de kolonie, gebruik wij.', 'j0k1l2');
SELECT setval('animals_id_seq', (SELECT MAX(id) FROM public.animals));

CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin','admin','staff')),
  scopes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_permissions_user_id_idx ON public.user_permissions(user_id);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own permissions" ON public.user_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.animal_care_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id integer NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ok',
  note text,
  logged_on date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_care_logs TO authenticated;
GRANT ALL ON public.animal_care_logs TO service_role;

ALTER TABLE public.animal_care_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX animal_care_logs_animal_idx ON public.animal_care_logs (animal_id, logged_on DESC);

CREATE TRIGGER animal_care_logs_updated_at
BEFORE UPDATE ON public.animal_care_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.certificaten
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS certificaten_public_token_key
  ON public.certificaten (public_token);

REVOKE SELECT ON public.animals FROM anon, authenticated;
GRANT SELECT (id, organisation_id, name, species, description, image_url, qr_hash, created_at)
  ON public.animals TO anon, authenticated;
GRANT ALL ON public.animals TO service_role;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access rate_limits" ON public.rate_limits
  AS PERMISSIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS rate_limits_lookup_idx
  ON public.rate_limits (bucket, identifier, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket text,
  _identifier text,
  _max_events integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  DELETE FROM public.rate_limits
   WHERE occurred_at < now() - interval '1 day';

  SELECT count(*) INTO _count
    FROM public.rate_limits
   WHERE bucket = _bucket
     AND identifier = _identifier
     AND occurred_at > now() - make_interval(secs => _window_seconds);

  IF _count >= _max_events THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (bucket, identifier) VALUES (_bucket, _identifier);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

CREATE POLICY "Team reads care logs"
ON public.animal_care_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'staff')
  )
);

CREATE POLICY "Team writes care logs"
ON public.animal_care_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin', 'staff')
  )
  AND EXISTS (SELECT 1 FROM public.animals a WHERE a.id = animal_id)
);

CREATE POLICY "Admins update care logs"
ON public.animal_care_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Admins delete care logs"
ON public.animal_care_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('super_admin', 'admin')
  )
);

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
     WHERE up.user_id = _user_id
       AND up.role IN ('super_admin', 'admin', 'staff')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = _user_id
       AND ur.role IN ('super_admin', 'admin', 'staff')
  )
$$;

REVOKE ALL ON FUNCTION public.is_team_member(uuid) FROM PUBLIC, anon;

INSERT INTO public.products (id, organisation_id, title, description, price_cents, stock_quantity, is_packaging_free, c2c_eligible, c2c_refund_value_cents, title_nl, title_fr, title_en, desc_nl, desc_fr, desc_en, is_catalog) VALUES
 (1, 1, 'Biologisch kippenvoer', 'Lokaal gemalen graanmengeling voor kippen, per kilo te scheppen.', 350, 120, true, false, 0, 'Biologisch kippenvoer', 'Aliment bio pour poules', 'Organic chicken feed', 'Lokaal gemalen graanmengeling voor kippen, per kilo te scheppen.', 'Melange de cereales moulu localement pour les poules, au kilo.', 'Locally milled grain mix for chickens, sold by the kilo.', true),
 (2, 1, 'Hooi voor konijnen', 'Kruidenrijk stadshooi uit de weides van het Maximiliaanpark.', 450, 80, true, false, 0, 'Hooi voor konijnen', 'Foin pour lapins', 'Hay for rabbits', 'Kruidenrijk stadshooi uit de weides van het Maximiliaanpark.', 'Foin urbain riche en herbes des prairies du parc Maximilien.', 'Herb-rich urban hay from the Maximilien park meadows.', true),
 (3, 1, 'Emmer 5 l (statiegeld)', 'Verzinkte emmer om voer of compost mee te nemen. Waarborg terug bij retour.', 600, 40, true, true, 600, 'Emmer 5 l (statiegeld)', 'Seau 5 l (consigne)', 'Bucket 5 l (deposit)', 'Verzinkte emmer om voer of compost mee te nemen. Waarborg terug bij retour.', 'Seau galvanise pour emporter aliment ou compost. Consigne remboursee au retour.', 'Galvanised bucket for feed or compost. Deposit refunded on return.', true),
 (4, 1, 'Pot honing', 'Rauwe bloemenhoning van onze daktuinimkerij, 250 g.', 850, 35, true, true, 100, 'Pot honing', 'Pot de miel', 'Jar of honey', 'Rauwe bloemenhoning van onze daktuinimkerij, 250 g.', 'Miel de fleurs brut de notre rucher sur le toit, 250 g.', 'Raw wildflower honey from our rooftop apiary, 250 g.', true),
 (5, 1, 'Compost', 'Gerijpte wijkcompost, per schep uit de composthoek.', 200, 200, true, false, 0, 'Compost', 'Compost', 'Compost', 'Gerijpte wijkcompost, per schep uit de composthoek.', 'Compost de quartier mature, a la pelle.', 'Mature neighbourhood compost, by the scoop.', true),
 (6, 1, 'Boerderij-eieren', 'Verse eieren van onze scharrelkippen, per zes.', 300, 60, true, false, 0, 'Boerderij-eieren', 'Oeufs de la ferme', 'Farm eggs', 'Verse eieren van onze scharrelkippen, per zes.', 'Oeufs frais de nos poules en plein air, par six.', 'Fresh eggs from our free-range hens, per six.', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval('products_id_seq', (SELECT MAX(id) FROM public.products));