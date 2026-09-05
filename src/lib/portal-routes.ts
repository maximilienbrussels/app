import type { Lang } from "./portal-types";

export const LANGS: Lang[] = ["fr", "nl", "en"];

export type PortalPage =
    | "today" | "requests" | "calendar" | "services" | "shop" | "academy" | "social" | "team"
  | "email" | "site" | "log" | "api" | "copilot" | "albums" | "residents";

export const PORTAL_PAGES: PortalPage[] = [
  "today",
  "requests",
  "calendar",
  "services",
  "shop",
  "academy",
  "social",
  "albums",
  "residents",
  "team",
  "email",
  "site",
  "log",
  "api",
  "copilot",
];

/** Language-specific URL slugs: /nl/vandaag, /fr/aujourdhui, /en/today … */
export const SLUGS: Record<Lang, Record<PortalPage, string>> = {
  nl: {
    today: "vandaag",
    requests: "aanvragen",
    calendar: "bezetting",
    services: "diensten",
    shop: "producten",
    academy: "academies",
    social: "sociaal",
    albums: "fotoalbums",
    residents: "bewoners",
    team: "team",
    email: "e-mail",
    site: "site",
    log: "logboek",
    api: "api",
    copilot: "co-pilot",
  },
  fr: {
    today: "aujourdhui",
    requests: "demandes",
    calendar: "occupation",
    services: "services",
    shop: "produits",
    academy: "academies",
    social: "social",
    albums: "albums-photos",
    residents: "residents",
    team: "equipe",
    email: "e-mail",
    site: "site",
    log: "journal",
    api: "api",
    copilot: "co-pilote",
  },
  en: {
    today: "today",
    requests: "requests",
    calendar: "occupancy",
    services: "services",
    shop: "products",
    academy: "academies",
    social: "social",
    albums: "photo-albums",
    residents: "residents",
    team: "team",
    email: "email",
    site: "site",
    log: "log",
    api: "api",
    copilot: "co-pilot",
  },
};

export const isLang = (value: string): value is Lang => (LANGS as string[]).includes(value);

/** Canonical app paths: /nl/vandaag, /fr/aujourdhui, /en/today … */
export const pathFor = (lang: Lang, page: PortalPage) => `/${lang}/${SLUGS[lang][page]}`;

/** True voor een portaalpad (/nl/vandaag, /fr/demandes …). */
export function isPortalPath(pathname: string): boolean {
  const parts = (pathname || "/").split("/").filter(Boolean);
  if (parts.length !== 2) return false;
  const [lang, slug] = parts as [string, string];
  return isLang(lang) && pageFromSlug(lang, slug) !== null;
}

export const DEFAULT_LANG: Lang = "nl";

/** Per-page head metadata (Dutch, portal is internal & noindex). */
export const PAGE_META: Record<PortalPage, { title: string; description: string }> = {
  today: {
    title: "Vandaag — Beheerportaal Ferme du Parc Maximilien",
    description:
      "Dagoverzicht voor het terreinteam: groepen, bezoekers, gereserveerde zones en check-ins.",
  },
  requests: {
    title: "Aanvragen (CRM) — Beheerportaal Ferme du Parc",
    description:
      "Beheer teambuilding-, privatiserings- en zaalverhuuraanvragen via kanban of tabel.",
  },
  calendar: {
    title: "Kalender & Bezetting — Beheerportaal Ferme du Parc",
    description:
      "Visuele bezetting per ruimte, slots blokkeren voor onderhoud en handmatige reservaties toevoegen.",
  },
  services: {
    title: "Diensten & Tarieven — Beheerportaal Ferme du Parc",
    description:
      "Pas prijzen, drietalige beschrijvingen en zichtbaarheid van arrangementen aan zonder code.",
  },
  shop: {
    title: "Producten & Webshop — Beheerportaal Ferme du Parc",
    description:
      "Beheer hoevewinkelproducten, prijzen, voorraad en volg de binnenkomende bestellingen op.",
  },
  academy: {
    title: "Academies — Beheerportaal Ferme du Parc",
    description:
      "Beheer academykaarten en quizvragen in NL/FR/EN, bekijk de preview zoals bezoekers ze zien en vraag goedkeuring om live te gaan.",
  },
  social: {
    title: "Social — Beheerportaal Ferme du Parc",
    description:
      "Beheer Bluesky-berichten en eigen social posts, en de centrale beeldbank voor alle media.",
  },
  albums: {
    title: "Fotoalbums — Beheerportaal Ferme du Parc",
    description:
      "Voeg foto's toe per thema of per dier, pas de volgorde en bijschriften aan, en verwijder beelden uit de opslag.",
  },
  residents: {
    title: "Bewoners & dieren — Beheerportaal Ferme du Parc",
    description:
      "Beheer de dieren van de boerderij: naam, soort, verhaaltje en profielfoto voor 'De bewoners' op de site.",
  },
  team: {
    title: "Teambeheer — Beheerportaal Ferme du Parc",
    description: "Beheer teamprofielen, rollen (Admin/Team) en toegang tot het beheerportaal.",
  },
  email: {
    title: "E-mail & mailserver — Beheerportaal Ferme du Parc",
    description:
      "Stel de mailserver in, verstuur een testmail en bekijk waarom een mail eventueel niet aankwam.",
  },
  site: {
    title: "Site — Beheerportaal Ferme du Parc",
    description:
      "Zet publieke pagina's of modules tijdelijk uit, beheer de onderhoudsmodus en de aankondigingsbalk.",
  },
  log: {
    title: "Logboek & prullenbak — Beheerportaal Ferme du Parc",
    description:
      "Bekijk wie wat wijzigde in het portaal en herstel per ongeluk verwijderde items binnen 30 dagen.",
  },
  api: {
    title: "API & Integraties — Beheerportaal Ferme du Parc",
    description:
      "Beheer API-sleutels voor externe integraties met de hoevewinkel, boekingen en Maxim-kennisbank.",
  },
  copilot: {
    title: "Admin Co-Pilot — Beheerportaal Ferme du Parc",
    description:
      "Vraag de AI Co-Pilot om site-instellingen, tarieven, openingsuren, pagina-afbeeldingen of e-mailsjablonen aan te passen.",
  },
};

export function pageFromSlug(lang: Lang, slug: string): PortalPage | null {
  const entries = Object.entries(SLUGS[lang]) as [PortalPage, string][];
  return entries.find(([, s]) => s === slug)?.[0] ?? null;
}

/** Legacy single-segment Dutch URLs (/vandaag) still resolve to the new structure. */
export function legacyPage(slug: string): PortalPage | null {
  for (const lang of LANGS) {
    const page = pageFromSlug(lang, slug);
    if (page) return page;
  }
  return null;
}

export const LOCALE: Record<Lang, string> = { fr: "fr-BE", nl: "nl-BE", en: "en-GB" };
