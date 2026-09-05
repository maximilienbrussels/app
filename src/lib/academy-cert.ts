/**
 * Dynamische certificaatconfiguratie per academie/diersoort.
 *
 * Alles wat op het A4-certificaat per dier verschilt staat hier centraal:
 * de unieke code-prefix voor de verificatie-ID en de behaalde
 * module-competenties (NL/FR/EN). Nieuwe academies werken meteen mee: zonder
 * eigen configuratie valt alles terug op een generieke, correcte tekst.
 */

export type CertLang = "nl" | "fr" | "en";

export type CertModule = { titel: string; body: string };

/** Publieke canonieke basis voor de QR-verificatie (ook geldig op papier). */
export const CERT_VERIFY_BASE = "https://maximilien.brussels/verifieer";

export function certVerifyUrl(token: string | null | undefined, fallbackId: string) {
  return `${CERT_VERIFY_BASE}?id=${encodeURIComponent(token || fallbackId)}`;
}

/**
 * Absolute verificatie-URL op basis van de leesbare certificaatcode.
 * Dit is wat de QR-code op het A4-certificaat bevat:
 * https://maximilien.brussels/verifieer/KNJ-2026-0001
 */
export function certVerifyCodeUrl(code: string) {
  return `${CERT_VERIFY_BASE}/${encodeURIComponent(String(code).replace(/^#/, ""))}`;
}

/** Unieke code-prefix per academie: #KIP-2026-0001, #HND-2026-0001, ... */
const CODE_PREFIXES: Record<string, string> = {
  kip: "KIP",
  kippen: "KIP",
  stadshond: "HND",
  hond: "HND",
  konijn: "KNJ",
  geit: "GEI",
  ezel: "EZL",
  bij: "BIJ",
  bijen: "BIJ",
  varken: "VRK",
  minivarken: "VRK",
  schaap: "SCH",
  paard: "PRD",
  pony: "PON",
  eend: "END",
  kwartel: "KWR",
  gans: "GNS",
  kalkoen: "KLK",
  cavia: "CAV",
  rat: "RAT",
  "tamme-rat": "RAT",
  kat: "KAT",
  duif: "DUF",
  alpaca: "ALP",
  vis: "VIS",
  "aquarium-goudvis": "VIS",
  compost: "CMP",
  moestuin: "MOE",
};

export function academyCodePrefix(slug: string | undefined | null): string {
  const key = (slug ?? "").trim().toLowerCase();
  if (CODE_PREFIXES[key]) return CODE_PREFIXES[key]!;
  const letters = key.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return letters.slice(0, 3) || "CER";
}

/** Generieke competenties — gelden voor élke diersoort zonder eigen lijst. */
const GENERIC: Record<CertLang, CertModule[]> = {
  nl: [
    {
      titel: "Dierenwelzijn, voeding & verzorging",
      body: "Basisbehoeften, dagelijkse voeding, drinkwater en gezondheidscontrole.",
    },
    {
      titel: "Gedrag & lichaamstaal",
      body: "Sociale structuur, stresssignalen en veilige benadering van de dieren.",
    },
    {
      titel: "Huisvesting & hygiënestandaarden",
      body: "Inrichting, strooisel, reiniging en preventie van ziektes.",
    },
  ],
  fr: [
    {
      titel: "Bien-être animal, alimentation & soins",
      body: "Besoins de base, alimentation quotidienne, eau et contrôle de santé.",
    },
    {
      titel: "Comportement & langage corporel",
      body: "Structure sociale, signaux de stress et approche sécurisée des animaux.",
    },
    {
      titel: "Hébergement & normes d'hygiène",
      body: "Aménagement, litière, nettoyage et prévention des maladies.",
    },
  ],
  en: [
    {
      titel: "Animal welfare, feeding & care",
      body: "Basic needs, daily feeding, drinking water and health checks.",
    },
    {
      titel: "Behaviour & body language",
      body: "Social structure, stress signals and safe handling of the animals.",
    },
    {
      titel: "Housing & hygiene standards",
      body: "Layout, bedding, cleaning and disease prevention.",
    },
  ],
};

type ModulesBySlug = Record<string, Partial<Record<CertLang, CertModule[]>>>;

/** Specifieke competenties per diersoort. */
const MODULES: ModulesBySlug = {
  kip: {
    nl: [
      { titel: "Voeding & legproces", body: "Legkorrel, grit, drinkwater en het ritme van het ei." },
      { titel: "Pikorde & gedrag", body: "Rangorde in de ren, stresssignalen en veilig oppakken." },
      { titel: "Hok, uitloop & hygiëne", body: "Zitstokken, legnesten, strooisel en preventie van bloedluis." },
    ],
    fr: [
      { titel: "Alimentation & ponte", body: "Granulés, grit, eau et rythme de la ponte." },
      { titel: "Hiérarchie & comportement", body: "Ordre social, signaux de stress et manipulation sûre." },
      { titel: "Poulailler, parcours & hygiène", body: "Perchoirs, pondoirs, litière et prévention du pou rouge." },
    ],
    en: [
      { titel: "Feeding & laying", body: "Layer pellets, grit, water and the rhythm of the egg." },
      { titel: "Pecking order & behaviour", body: "Social rank, stress signals and safe handling." },
      { titel: "Coop, run & hygiene", body: "Perches, nest boxes, bedding and red mite prevention." },
    ],
  },
  konijn: {
    nl: [
      { titel: "Voeding & knaagbehoefte", body: "Onbeperkt hooi, verse groenten en gezond gebit." },
      { titel: "Huisvesting & ren", body: "Ruimte om te hoppen, schuilplaats en veilige bodem." },
      { titel: "Gezondheidscheck", body: "Vacht, nagels, oren, eetlust en signalen van pijn." },
    ],
    fr: [
      { titel: "Alimentation & besoin de ronger", body: "Foin à volonté, légumes frais et dents saines." },
      { titel: "Hébergement & enclos", body: "Espace pour bondir, cachette et sol sécurisé." },
      { titel: "Contrôle de santé", body: "Pelage, griffes, oreilles, appétit et signes de douleur." },
    ],
    en: [
      { titel: "Feeding & gnawing needs", body: "Unlimited hay, fresh greens and healthy teeth." },
      { titel: "Housing & run", body: "Room to hop, a hideout and a safe floor." },
      { titel: "Health check", body: "Coat, nails, ears, appetite and signs of pain." },
    ],
  },
  stadshond: {
    nl: [
      { titel: "Hond in de stad", body: "Wandelen aan de leiband, verkeer, drukte en opruimen." },
      { titel: "Lichaamstaal & contact", body: "Kalmeringssignalen, veilig groeten en kinderen leren lezen." },
      { titel: "Verzorging & welzijn", body: "Beweging, rust, voeding en de wettelijke plichten van de baas." },
    ],
    fr: [
      { titel: "Le chien en ville", body: "Promenade en laisse, circulation, foule et ramassage." },
      { titel: "Langage corporel & contact", body: "Signaux d'apaisement, salutation sûre et lecture du chien." },
      { titel: "Soins & bien-être", body: "Exercice, repos, alimentation et devoirs du maître." },
    ],
    en: [
      { titel: "Dogs in the city", body: "Leash walking, traffic, crowds and cleaning up." },
      { titel: "Body language & contact", body: "Calming signals, safe greeting and reading the dog." },
      { titel: "Care & welfare", body: "Exercise, rest, food and the owner's legal duties." },
    ],
  },
  geit: {
    nl: [
      { titel: "Voeding & herkauwen", body: "Ruwvoer, mineralen en een gezonde pens." },
      { titel: "Kuddegedrag & klimmen", body: "Rangorde, nieuwsgierigheid en veilige verrijking." },
      { titel: "Stal, weide & klauwen", body: "Droge ligplaats, afrastering en klauwverzorging." },
    ],
  },
  ezel: {
    nl: [
      { titel: "Voeding & hoefverzorging", body: "Vezelrijk voer, geen overgewicht en regelmatig bekappen." },
      { titel: "Gedrag & vertrouwen", body: "Ezels bevriezen bij stress: rust, geduld en leiden." },
      { titel: "Huisvesting & weidebeheer", body: "Droge schuilstal, gezelschap en beperkt gras." },
    ],
  },
  bij: {
    nl: [
      { titel: "Het bijenvolk", body: "Koningin, werksters, darren en de jaarcyclus van de kast." },
      { titel: "Bestuiving & dracht", body: "Drachtplanten, nectar, stuifmeel en biodiversiteit in de stad." },
      { titel: "Veilig imkeren", body: "Kastinspectie, beschermkledij en zwermpreventie." },
    ],
  },
  minivarken: {
    nl: [
      { titel: "Voeding & wroeten", body: "Gebalanceerd rantsoen, geen keukenafval en wroetruimte." },
      { titel: "Intelligentie & gedrag", body: "Sociale groep, verrijking en signalen van verveling." },
      { titel: "Stal, modder & huid", body: "Modderbad tegen zonnebrand, droge ligplek en hygiëne." },
    ],
  },
  schaap: {
    nl: [
      { titel: "Voeding & begrazing", body: "Gras, hooi, mineralen en rotatiebegrazing." },
      { titel: "Kuddegedrag", body: "Vluchtdier, veilig drijven en rustig benaderen." },
      { titel: "Scheren, klauwen & gezondheid", body: "Vachtverzorging, klauwbekapping en parasietencontrole." },
    ],
  },
  paard: {
    nl: [
      { titel: "Voeding & wateropname", body: "Ruwvoer eerst, vaste tijden en risico op koliek." },
      { titel: "Gedrag & veiligheid", body: "Blinde hoeken, naderen langs de schouder en leiden." },
      { titel: "Stal, weide & hoeven", body: "Bewegingsruimte, gezelschap en dagelijkse hoefzorg." },
    ],
  },
};

/**
 * Competenties voor een academie in de gevraagde taal.
 * Valt terug op de Nederlandse lijst en vervolgens op de generieke lijst,
 * zodat élke diersoort — ook nieuwe — een volwaardige achterzijde krijgt.
 */
export function academyModules(slug: string | undefined | null, lang: CertLang): CertModule[] {
  const key = (slug ?? "").trim().toLowerCase();
  const entry = MODULES[key];
  return entry?.[lang] ?? entry?.nl ?? GENERIC[lang] ?? GENERIC.nl;
}
