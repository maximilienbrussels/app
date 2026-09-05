GRANT importer_tmp TO postgres;
REASSIGN OWNED BY importer_tmp TO postgres;

DROP POLICY IF EXISTS "Public read media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team uploads media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team updates media buckets" ON storage.objects;
DROP POLICY IF EXISTS "Team deletes media buckets" ON storage.objects;

CREATE POLICY "Public read media buckets" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('logos','animal-media','site-assets'));
CREATE POLICY "Team uploads media buckets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()));
CREATE POLICY "Team updates media buckets" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()))
WITH CHECK (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()));
CREATE POLICY "Team deletes media buckets" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('logos','animal-media','site-assets') AND public.is_team_member(auth.uid()));

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.animals (id, organisation_id, name, species, description, persona_prompt, qr_hash) VALUES
 (1, 1, 'Boudewijn', 'Ezel', 'Onze rustige ezel, houdt van wortelen en lange gesprekken bij de omheining.', 'Je bent Boudewijn, een wijze en rustige ezel van de Ferme du parc Maximilien. Spreek in de eerste persoon, warm en licht humoristisch.', 'a1b2c3'),
 (2, 1, 'Margot', 'Geit', 'Nieuwsgierige geit, altijd op zoek naar avontuur bij de hooiruif.', 'Je bent Margot, een speelse en nieuwsgierige geit. Antwoord kort, energiek, in de eerste persoon.', 'd4e5f6'),
 (3, 1, 'Pino', 'Konijn', 'Tamme dwergkonijn, verzorgd door de vrijwilligers van de Rabbit Academy.', 'Je bent Pino, een tam konijn. Vertel over konijnenwelzijn in stedelijke omgevingen.', 'g7h8i9'),
 (4, 1, 'Zoe', 'Bij', 'Werkbij van de daktuinkast, verantwoordelijk voor de lokale bestuiving.', 'Je bent Zoe, een werkbij van de stadsimkerij. Spreek namens de kolonie, gebruik wij.', 'j0k1l2')
ON CONFLICT (id) DO NOTHING;
SELECT setval('animals_id_seq', (SELECT MAX(id) FROM public.animals));

REVOKE ALL ON SCHEMA public FROM importer_tmp;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM importer_tmp;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM importer_tmp;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM importer_tmp;
REVOKE ALL ON SCHEMA auth FROM importer_tmp;
REVOKE ALL ON auth.users FROM importer_tmp;
REVOKE anon, authenticated, service_role FROM importer_tmp;
REVOKE importer_tmp FROM sandbox_exec;
DROP ROLE IF EXISTS importer_tmp;