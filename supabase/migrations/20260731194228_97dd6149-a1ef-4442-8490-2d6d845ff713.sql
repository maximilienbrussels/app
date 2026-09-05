ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS categorie text NOT NULL DEFAULT 'boerderij',
  ADD COLUMN IF NOT EXISTS prioriteit integer NOT NULL DEFAULT 100;

UPDATE public.academies SET categorie='knaagdieren', prioriteit=10 WHERE slug='konijn';
UPDATE public.academies SET categorie='boerderij', prioriteit=20 WHERE slug='kip';
UPDATE public.academies SET categorie='boerderij', prioriteit=30 WHERE slug='geit';

DO $mig$
DECLARE
  payload jsonb := $json$[
  {"naam":"Cavia","slug":"cavia","icon":"Squirrel","categorie":"knaagdieren","prioriteit":11,
   "beschrijving":"Groepsdieren met een grote behoefte aan vitamine C, hooi en grondoppervlakte.",
   "vragen":[
    {"q":"Hoeveel cavias horen minimaal samen te leven?","o":["Eentje alleen is prima","Minimaal twee, cavias zijn groepsdieren","Alleen met een konijn erbij"],"c":1},
    {"q":"Waarom heeft een cavia dagelijks verse groenten nodig?","o":["Voor extra vet","Omdat ze zelf geen vitamine C aanmaken","Om hun nagels te slijten"],"c":1},
    {"q":"Wat vormt de basis van het caviadieet?","o":["Onbeperkt hooi","Muesli met zaadjes","Brood"],"c":0},
    {"q":"Welke bodemruimte is een goed minimum voor twee cavias?","o":["0,5 m2","1,5 m2 of meer","Een kooi van 60 cm"],"c":1},
    {"q":"Wat betekent luid piepen bij het opendoen van de koelkast?","o":["Pijn","Vraag om eten of aandacht","Angst voor geluid"],"c":1},
    {"q":"Waarom is een hoge klimkooi ongeschikt voor cavias?","o":["Ze klimmen slecht en kunnen vallen","Ze houden niet van hoogte","Ze slapen liever hoog"],"c":0}
   ]},
  {"naam":"Hamster","slug":"hamster","icon":"Rat","categorie":"knaagdieren","prioriteit":12,
   "beschrijving":"Solitaire nachtdieren die diep willen graven en veel bodemdiepte nodig hebben.",
   "vragen":[
    {"q":"Hoe leeft een goudhamster in de natuur?","o":["In grote groepen","Strikt solitair","In paren"],"c":1},
    {"q":"Hoeveel bodembedekking heeft een hamster minimaal nodig om te graven?","o":["2 cm","10 cm","Minimaal 20 tot 40 cm"],"c":2},
    {"q":"Wanneer is een hamster het meest actief?","o":["Vroeg in de ochtend","In de avond en nacht","Midden op de dag"],"c":1},
    {"q":"Welk looprad is veilig?","o":["Een groot rad met dichte loopvlakte","Een rad met tralies","Een bal om in te rollen"],"c":0},
    {"q":"Waarom mag je een slapende hamster niet wakker maken om te knuffelen?","o":["Dan bijt hij uit schrik en raakt gestrest","Dan slaapt hij nooit meer","Dat maakt niets uit"],"c":0},
    {"q":"Wat hoort NIET in het voer van een hamster?","o":["Zaden","Citrusvruchten en zoetigheid","Wat eiwit zoals meelworm"],"c":1}
   ]},
  {"naam":"Tamme rat","slug":"tamme-rat","icon":"Rat","categorie":"knaagdieren","prioriteit":13,
   "beschrijving":"Zeer intelligente sociale dieren met gevoelige luchtwegen en veel klimbehoefte.",
   "vragen":[
    {"q":"Waarom houd je tamme ratten nooit alleen?","o":["Ze zijn sterk sociaal en vereenzamen","Ze eten dan te veel","Ze worden te tam"],"c":0},
    {"q":"Welke bodembedekking is slecht voor de luchtwegen van een rat?","o":["Papiersnippers","Houtsnippers van ceder of pijnboom","Hennepvezel"],"c":1},
    {"q":"Hoe verrijk je een rattenverblijf het best?","o":["Veel klimtouwen, hangmatten en etages","Een lege glazen bak","Enkel een looprad"],"c":0},
    {"q":"Waar pak je een rat nooit bij op?","o":["Bij de staart","Met twee handen rond het lichaam","Met een handje voer erbij"],"c":0},
    {"q":"Welk teken wijst op een luchtweginfectie?","o":["Piepende ademhaling en niezen","Veel poetsen","Rode kleur van de porfyrine rond de ogen alleen"],"c":0},
    {"q":"Hoe vaak train of speel je best met je ratten?","o":["Elke dag even buiten de kooi","Een keer per maand","Nooit, dat stresseert"],"c":0}
   ]},
  {"naam":"Korenslang","slug":"korenslang","icon":"Worm","categorie":"exoten","prioriteit":41,
   "beschrijving":"Terrariumbewoner met temperatuurzones, schuilplaatsen en diepvriesvoer.",
   "vragen":[
    {"q":"Wat is een veilig warmteverloop in het terrarium?","o":["Overal exact dezelfde temperatuur","Een warme en een koele zone zodat de slang kiest","Zo warm mogelijk"],"c":1},
    {"q":"Welk voer is het veiligst voor een korenslang?","o":["Ontdooide diepvriesmuis","Levende muis","Rauw rundvlees"],"c":0},
    {"q":"Wat gebeurt er tijdens de vervelling?","o":["De ogen worden melkachtig en de slang wil rust","De slang eet extra veel","De slang wordt tammer"],"c":0},
    {"q":"Waarom is een goed sluitend deksel essentieel?","o":["Korenslangen zijn meesters in ontsnappen","Voor de luchtvochtigheid alleen","Voor de verlichting"],"c":0},
    {"q":"Wat hoort in elk terrarium?","o":["Minstens twee schuilplaatsen en een waterbak","Enkel kunstplanten","Een spiegel"],"c":0},
    {"q":"Wanneer hanteer je je slang beter niet?","o":["Vlak na een maaltijd of tijdens vervelling","In de avond","Na het verschonen"],"c":0}
   ]},
  {"naam":"Baardagame","slug":"baardagame","icon":"Turtle","categorie":"exoten","prioriteit":42,
   "beschrijving":"Woestijnhagedis die UVB-licht, een warme zonneplek en calcium nodig heeft.",
   "vragen":[
    {"q":"Waarom is UVB-licht onmisbaar?","o":["Voor de aanmaak van vitamine D3 en sterke botten","Enkel voor de kleur","Om te slapen"],"c":0},
    {"q":"Hoe warm mag de zonneplek ongeveer worden?","o":["20 graden","Rond 38 tot 42 graden","Boven 55 graden"],"c":1},
    {"q":"Wat eet een jonge baardagame vooral?","o":["Vooral insecten met wat groen","Enkel fruit","Enkel salade"],"c":0},
    {"q":"Waarom bestrooi je insecten met calciumpoeder?","o":["Ter voorkoming van botziekte","Voor de smaak","Om ze traag te maken"],"c":0},
    {"q":"Wat betekent een zwarte baard en opengesperde mond?","o":["Stress of dreiging","Honger","Dorst"],"c":0},
    {"q":"Welke bodem is riskant voor jonge dieren?","o":["Los fijn zand dat ze inslikken","Terrariumtegels","Keukenpapier"],"c":0}
   ]},
  {"naam":"Landschildpad","slug":"landschildpad","icon":"Turtle","categorie":"exoten","prioriteit":43,
   "beschrijving":"Dier dat tientallen jaren oud wordt, met winterrust en een vezelrijk dieet.",
   "vragen":[
    {"q":"Hoe oud kan een landschildpad worden?","o":["Ongeveer 10 jaar","Vaak 50 jaar of veel meer","Maximaal 5 jaar"],"c":1},
    {"q":"Wat is het beste dieet?","o":["Vezelrijke kruiden en wilde plantjes","Hondenbrokken","Vooral fruit"],"c":0},
    {"q":"Waarom is een te snelle groei gevaarlijk?","o":["Dat geeft een bultig schild en botproblemen","Dan wordt hij te tam","Dat is niet gevaarlijk"],"c":0},
    {"q":"Wat heeft een schildpad nodig voor winterrust?","o":["Een koele, veilige overwinterplek","Extra warmte","Dagelijks eten"],"c":0},
    {"q":"Waarom hoort een landschildpad niet in een aquarium met water?","o":["Het is een landdier en kan verdrinken","Hij zwemt te snel","Het water wordt vies"],"c":0},
    {"q":"Wat mag NOOIT op het menu?","o":["Brood en zuivel","Paardenbloem","Hooi"],"c":0}
   ]},
  {"naam":"Axolotl","slug":"axolotl","icon":"Fish","categorie":"exoten","prioriteit":44,
   "beschrijving":"Kwetsbare waterbewoner die koud, schoon water en rust nodig heeft.",
   "vragen":[
    {"q":"Welke watertemperatuur is ideaal?","o":["Rond 16 tot 18 graden","24 graden","Boven 28 graden"],"c":0},
    {"q":"Waarom raak je een axolotl beter niet aan?","o":["Zijn huid en kieuwen zijn extreem kwetsbaar","Hij bijt hard","Hij is giftig"],"c":0},
    {"q":"Welke bodem is veilig?","o":["Kaal of fijn zand","Grind ter grootte van zijn kop","Scherpe stenen"],"c":0},
    {"q":"Wat is een teken van slechte waterkwaliteit?","o":["Opgerolde kieuwen en weinig eetlust","Veel zwemmen","Rustig liggen"],"c":0},
    {"q":"Wat eet een axolotl vooral?","o":["Wormen en speciale axolotlpellets","Broodkruimels","Groenten"],"c":0},
    {"q":"Waarom zet je geen kleine visjes bij een axolotl?","o":["Zij bijten zijn kieuwen aan en brengen ziektes","Ze eten te veel","Dat kan gewoon"],"c":0}
   ]},
  {"naam":"Vogelspin","slug":"vogelspin","icon":"Bug","categorie":"invertebraten","prioriteit":61,
   "beschrijving":"Kijkdier met precieze eisen rond luchtvochtigheid, bodemdiepte en rust.",
   "vragen":[
    {"q":"Wat is de gouden regel bij vogelspinnen?","o":["Zo veel mogelijk hanteren","Zo weinig mogelijk hanteren, het is een kijkdier","Dagelijks knuffelen"],"c":1},
    {"q":"Waarom is een lage bak beter dan een hoge voor bodembewoners?","o":["Bij een val kan het achterlijf openbarsten","Ze klimmen niet graag","Voor het licht"],"c":0},
    {"q":"Wat doet een spin voor de vervelling?","o":["Weigert eten en ligt vaak op de rug","Eet extra veel","Wordt actiever"],"c":0},
    {"q":"Wat hoort altijd in het verblijf?","o":["Een schuilplaats en een klein waterbakje","Een looprad","Fel licht"],"c":0},
    {"q":"Hoe verwijder je voedselresten?","o":["Met een lange pincet","Met de hand","Niet"],"c":0},
    {"q":"Waarom nooit een prooi achterlaten tijdens vervelling?","o":["De spin is dan weerloos en zacht","De prooi ontsnapt","Het maakt niet uit"],"c":0}
   ]},
  {"naam":"Wandelende tak","slug":"wandelende-tak","icon":"Bug","categorie":"invertebraten","prioriteit":62,
   "beschrijving":"Plantenetend insect dat verse braam of klimop en dagelijks sproeien nodig heeft.",
   "vragen":[
    {"q":"Wat eten wandelende takken meestal?","o":["Verse braam-, klimop- of hazelaarbladeren","Zaden","Insecten"],"c":0},
    {"q":"Waarom sproei je het verblijf dagelijks?","o":["Ze drinken de druppels en vervellen beter","Om de bak te reinigen","Voor de temperatuur"],"c":0},
    {"q":"Hoe hoog moet het verblijf zijn?","o":["Hoog genoeg om vrij hangend te vervellen","Zo laag mogelijk","Hoogte maakt niets uit"],"c":0},
    {"q":"Hoe pak je een wandelende tak op?","o":["Laat hem zelf op je hand stappen","Bij een been vasthouden","Bij de kop"],"c":0},
    {"q":"Waarom mag je nooit takken van bespoten planten geven?","o":["Bestrijdingsmiddelen zijn dodelijk","Ze lusten die niet","Ze zijn te hard"],"c":0},
    {"q":"Wat doe je met eitjes als je geen kweek wil?","o":["Verantwoord invriezen, nooit in de natuur zetten","In de tuin leggen","In het bos uitzetten"],"c":0}
   ]},
  {"naam":"Valkparkiet","slug":"valkparkiet","icon":"Bird","categorie":"vogels","prioriteit":51,
   "beschrijving":"Sociale vogel die vliegruimte, gezelschap en een giftvrije woning nodig heeft.",
   "vragen":[
    {"q":"Waarom is een antiaanbakpan gevaarlijk?","o":["Overhitte damp is dodelijk voor vogels","Het geluid stoort","Het maakt niets uit"],"c":0},
    {"q":"Wat heeft een valkparkiet dagelijks nodig?","o":["Vrije vliegtijd buiten de kooi","Enkel zaad","Rust in het donker"],"c":0},
    {"q":"Wat betekent een hoge platte kam met sissen?","o":["Angst of irritatie","Blijheid","Honger"],"c":0},
    {"q":"Wat hoort NIET in het dieet?","o":["Avocado en chocolade","Kiemzaad","Groenten"],"c":0},
    {"q":"Waarom is enkel een zaadmengsel ongezond?","o":["Te vet en te weinig vitamines","Te duur","Te hard"],"c":0},
    {"q":"Wat helpt tegen verveling?","o":["Foerageerspeelgoed en dagelijkse aandacht","Een spiegel als enige gezelschap","Een grotere zaadbak"],"c":0}
   ]},
  {"naam":"Stadshond","slug":"stadshond","icon":"Dog","categorie":"huisdieren","prioriteit":1,
   "beschrijving":"Hond in een appartement: prikkelverwerking, rust en mentale uitdaging.",
   "vragen":[
    {"q":"Wat is even belangrijk als uitlaten?","o":["Mentale stimulatie zoals snuffelwerk","Meer eten","Meer bezoek"],"c":0},
    {"q":"Hoeveel slaap of rust heeft een hond gemiddeld per dag nodig?","o":["Ongeveer 6 uur","16 uur of meer","4 uur"],"c":1},
    {"q":"Wat is een teken van stress bij drukke stadsprikkels?","o":["Hijgen, gapen en likken zonder reden","Kwispelen","Snuffelen"],"c":0},
    {"q":"Hoe leer je een pup rustig alleen blijven?","o":["Stap voor stap opbouwen met korte afwezigheden","Meteen een hele dag","Nooit alleen laten"],"c":0},
    {"q":"Wat doe je bij een hond die niet wil begroeten?","o":["Ruimte geven en niet forceren","Toch laten aaien","Optillen"],"c":0},
    {"q":"Wat is veilig op een warme dag in de stad?","o":["Wandelen op koele momenten en asfalt testen met je hand","Middagwandeling","In de auto wachten"],"c":0}
   ]},
  {"naam":"Appartementskat","slug":"appartementskat","icon":"Cat","categorie":"huisdieren","prioriteit":2,
   "beschrijving":"Binnenkat met verticale ruimte, veilige balkons en genoeg kattenbakken.",
   "vragen":[
    {"q":"Hoeveel kattenbakken heb je best voor twee katten?","o":["Een","Drie, dus aantal katten plus een","Een per week"],"c":1},
    {"q":"Waarom is verticale ruimte belangrijk?","o":["Klimmen en overzicht verlagen stress","Om te eten","Voor de sier"],"c":0},
    {"q":"Hoe maak je een balkon veilig?","o":["Met kattennet of gaas volledig afschermen","Deur op een kier","Niets doen"],"c":0},
    {"q":"Wat betekent krabben aan de zetel?","o":["Natuurlijk gedrag, bied een goede krabpaal aan","Wraak","Honger"],"c":0},
    {"q":"Welke plant is giftig voor katten?","o":["Lelie","Kattengras","Basilicum"],"c":0},
    {"q":"Hoe voorkom je verveling bij een binnenkat?","o":["Dagelijks jachtspel en voedselpuzzels","Meer brokken","Tv aanlaten"],"c":0}
   ]}
  ]$json$::jsonb;
  a jsonb;
  v jsonb;
  aid uuid;
BEGIN
  FOR a IN SELECT * FROM jsonb_array_elements(payload) LOOP
    SELECT id INTO aid FROM public.academies WHERE slug = a->>'slug';
    IF aid IS NULL THEN
      INSERT INTO public.academies (diersoort_naam, slug, badge_icon, beschrijving, categorie, prioriteit, vragen_per_test, slaag_grens, is_active)
      VALUES (a->>'naam', a->>'slug', a->>'icon', a->>'beschrijving', a->>'categorie', (a->>'prioriteit')::int, 6, 5, true)
      RETURNING id INTO aid;
    ELSE
      UPDATE public.academies
        SET badge_icon = a->>'icon', beschrijving = a->>'beschrijving',
            categorie = a->>'categorie', prioriteit = (a->>'prioriteit')::int
        WHERE id = aid;
    END IF;

    FOR v IN SELECT * FROM jsonb_array_elements(a->'vragen') LOOP
      INSERT INTO public.academy_vragen (academy_id, vraag_tekst, opties, correcte_optie_index)
      SELECT aid, v->>'q', v->'o', (v->>'c')::int
      WHERE NOT EXISTS (
        SELECT 1 FROM public.academy_vragen w WHERE w.academy_id = aid AND w.vraag_tekst = v->>'q'
      );
    END LOOP;
  END LOOP;
END
$mig$;