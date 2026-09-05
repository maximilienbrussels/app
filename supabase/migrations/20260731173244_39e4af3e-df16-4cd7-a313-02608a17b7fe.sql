CREATE TYPE public.booking_status AS ENUM ('nieuw','in_behandeling','offerte_verzonden','gereserveerd','afgerond','geannuleerd');
CREATE TYPE public.booking_type AS ENUM ('teambuilding','privatisering','zaalverhuur','geblokkeerd');
CREATE TYPE public.day_status AS ENUM ('verwacht','aangekomen');

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND p.active
  )
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND p.active AND ur.role = 'admin'
  )
$$;

CREATE POLICY "Staff can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));

CREATE POLICY "Staff can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 0,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.locations TO anon;
GRANT SELECT ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations are public" ON public.locations FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_fr text NOT NULL,
  title_nl text NOT NULL,
  title_en text NOT NULL,
  desc_fr text NOT NULL DEFAULT '',
  desc_nl text NOT NULL DEFAULT '',
  desc_en text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  location_id text NOT NULL REFERENCES public.locations(id),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active services are public" ON public.services FOR SELECT TO anon USING (active);
CREATE POLICY "Staff can view all services" ON public.services FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated
  USING (public.is_active_admin(auth.uid())) WITH CHECK (public.is_active_admin(auth.uid()));

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT ('BK-' || upper(substr(md5(random()::text), 1, 6))),
  type public.booking_type NOT NULL DEFAULT 'zaalverhuur',
  status public.booking_status NOT NULL DEFAULT 'nieuw',
  client_name text NOT NULL,
  client_org text,
  client_email text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  location_id text NOT NULL REFERENCES public.locations(id),
  guests_count integer NOT NULL DEFAULT 0,
  options text[] NOT NULL DEFAULT '{}',
  price numeric(10,2) NOT NULL DEFAULT 0,
  day_status public.day_status NOT NULL DEFAULT 'verwacht',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view bookings" ON public.bookings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.is_active_admin(auth.uid()));

CREATE INDEX bookings_event_date_idx ON public.bookings (event_date);
CREATE INDEX bookings_status_idx ON public.bookings (status);

CREATE TABLE public.booking_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.booking_notes TO authenticated;
GRANT ALL ON public.booking_notes TO service_role;
ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view notes" ON public.booking_notes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can add notes" ON public.booking_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "Admins can delete notes" ON public.booking_notes FOR DELETE TO authenticated USING (public.is_active_admin(auth.uid()));

CREATE INDEX booking_notes_booking_idx ON public.booking_notes (booking_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER bookings_touch BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.master_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'jona@delplanche.com'::text $$;

CREATE OR REPLACE FUNCTION public.enforce_master_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = public.master_admin_email() THEN
    IF TG_OP = 'UPDATE' AND NEW.active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'De master admin kan niet worden gedeactiveerd.';
    END IF;
    NEW.active := true;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_enforce_master_admin
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_master_admin();

CREATE OR REPLACE FUNCTION public.sync_master_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = public.master_admin_email() THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role <> 'admin';
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER profiles_sync_master_admin_role
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_master_admin_role();

CREATE OR REPLACE FUNCTION public.protect_master_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_email text;
BEGIN
  SELECT lower(email) INTO target_email FROM public.profiles WHERE id = OLD.user_id;
  IF target_email = public.master_admin_email() AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'De beheerdersrol van de master admin kan niet worden gewijzigd.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

CREATE TRIGGER user_roles_protect_master
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_master_admin_role();

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.master_admin_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_master_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_master_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_master_admin_role() FROM PUBLIC, anon, authenticated;

INSERT INTO public.locations (id, name, capacity, base_price, sort_order) VALUES
  ('chalet', 'Chalet', 40, 150, 1),
  ('zaal', 'Zaal', 80, 260, 2),
  ('prairie', 'Prairie', 150, 200, 3),
  ('boerderij', 'Volledige boerderij', 250, 950, 4);

INSERT INTO public.services (title_fr, title_nl, title_en, desc_fr, desc_nl, desc_en, price, location_id, active, sort_order) VALUES
  ('Chalet — Demi-journée','Chalet — Halve dag','Chalet — Half day','Location du chalet pour 4 heures, jusqu''à 40 personnes.','Verhuur van het chalet voor 4 uur, tot 40 personen.','Chalet rental for 4 hours, up to 40 people.',150,'chalet',true,1),
  ('Chalet — Journée complète','Chalet — Volledige dag','Chalet — Full day','Location du chalet de 9h à 22h.','Verhuur van het chalet van 9u tot 22u.','Chalet rental from 9am to 10pm.',260,'chalet',true,2),
  ('Teambuilding à la ferme','Teambuilding op de boerderij','Teambuilding at the farm','Programme d''une journée avec ateliers potager et animaux.','Dagprogramma met moestuin- en dierenworkshops.','Full-day programme with garden and animal workshops.',48,'prairie',true,3),
  ('Location de salle — Soirée','Zaalverhuur — Avond','Hall rental — Evening','Salle polyvalente de 18h à 23h, 80 personnes.','Polyvalente zaal van 18u tot 23u, 80 personen.','Multipurpose hall from 6pm to 11pm, 80 people.',420,'zaal',true,4),
  ('Privatisation complète','Volledige privatisering','Full privatisation','Toute la ferme réservée pour votre événement.','De volledige boerderij gereserveerd voor uw evenement.','The entire farm reserved for your event.',2400,'boerderij',true,5),
  ('Atelier fromage','Workshop kaasmaken','Cheese-making workshop','Atelier de 2h avec dégustation.','Workshop van 2u met degustatie.','Two-hour workshop including tasting.',32,'chalet',false,6);

INSERT INTO public.bookings (reference, type, status, client_name, client_org, client_email, client_phone, event_date, start_time, end_time, location_id, guests_count, options, price, day_status) VALUES
  ('BK-101','teambuilding','gereserveerd','Sofie Vermeulen','Brussels Health Lab','sofie@bhl.be','+32 478 22 11 09', CURRENT_DATE, '09:30','16:00','prairie',24, ARRAY['Lunch boerderij','Begeleide moestuinworkshop'],1180,'verwacht'),
  ('BK-102','zaalverhuur','gereserveerd','Karim Belhaj','Buurtcomité Laken','karim.belhaj@laken.brussels','+32 495 61 40 77', CURRENT_DATE, '18:00','22:30','zaal',55, ARRAY['Geluidsinstallatie'],420,'verwacht'),
  ('BK-103','zaalverhuur','gereserveerd','Émilie Dubois','Atelier Céramique','emilie@atelierceramique.be','+32 470 88 12 30', CURRENT_DATE, '13:00','17:00','chalet',12, ARRAY['Koffiepauze'],180,'aangekomen'),
  ('BK-104','privatisering','offerte_verzonden','Nathalie Peeters','Fondation Verte','n.peeters@fondationverte.org','+32 486 33 90 12', CURRENT_DATE + 9, '10:00','23:00','boerderij',180, ARRAY['Volledige privatisering','Foodtrucks'],4200,'verwacht'),
  ('BK-105','teambuilding','nieuw','Tom Claes','Nordic Software','tom.claes@nordicsw.eu','+32 472 10 55 41', CURRENT_DATE + 24, '09:00','17:00','prairie',35, ARRAY['Teambuilding à la ferme','BBQ'],1750,'verwacht'),
  ('BK-106','zaalverhuur','nieuw','Fatima Ouahbi',NULL,'fatima.ouahbi@example.com','+32 493 77 21 08', CURRENT_DATE + 17, '14:00','19:00','zaal',60, ARRAY['Verjaardagsfeest'],380,'verwacht'),
  ('BK-107','teambuilding','in_behandeling','Pierre Lemaire','Cabinet Lemaire','p.lemaire@cablem.be','+32 477 45 62 19', CURRENT_DATE + 12, '13:30','18:00','chalet',18, ARRAY['Workshop kaasmaken'],890,'verwacht'),
  ('BK-108','privatisering','afgerond','Lucas Martin','Coop Bruxelles','lucas@coopbxl.be','+32 484 12 76 03', CURRENT_DATE - 14, '11:00','20:00','boerderij',120, ARRAY['Privatisering namiddag'],3100,'aangekomen'),
  ('BK-109','zaalverhuur','geannuleerd','Anouk De Wit',NULL,'anouk.dewit@example.com','+32 468 90 34 55', CURRENT_DATE - 4, '15:00','20:00','zaal',40, '{}',0,'verwacht'),
  ('BK-110','geblokkeerd','gereserveerd','Onderhoud terrein',NULL,'','', CURRENT_DATE + 5, '08:00','18:00','prairie',0, '{}',0,'verwacht'),
  ('BK-111','teambuilding','gereserveerd','Ines Rossi','Studio Nord','ines@studionord.be','+32 471 09 88 24', CURRENT_DATE + 2, '09:00','15:30','chalet',16, ARRAY['Lunch boerderij'],760,'verwacht');

INSERT INTO public.booking_notes (booking_id, author_name, body)
SELECT b.id, 'Systeem', n.body FROM public.bookings b
JOIN (VALUES
  ('BK-101','Catering komt om 11:30'),
  ('BK-101','Extra tafels klaarzetten'),
  ('BK-102','Sleutel afhalen aan het onthaal'),
  ('BK-103','Klant brengt eigen materiaal mee'),
  ('BK-104','Offerte v2 verzonden op vraag van klant'),
  ('BK-107','Wacht op bevestiging aantal deelnemers'),
  ('BK-110','Maaiwerken en herstel omheining')
) AS n(ref, body) ON n.ref = b.reference;