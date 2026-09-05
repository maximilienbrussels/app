import { LocalLink } from "@/components/LocalLink";
import { pathFor } from "@/lib/routes-i18n";
import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useSiteContact } from "@/lib/use-site-config";
import { contactAddressLine } from "@/lib/site-config";
import type { Lang } from "@/lib/i18n";
import { SocialCarousel } from "./SocialCarousel";
import { LocationLink } from "./LocationLink";
import { RoutBadge } from "./RoutBadge";
// Farm identity constants — brief specifies address Quai du Batelage 2.
const PHONE = "+32 2 201 56 09";

const LINK = "hover:text-[color:var(--color-terracotta)]";
const DISCOVER_TITLE: Record<Lang, string> = { nl: "Ontdekken", fr: "Découvrir", en: "Discover" };
const BOOK_TITLE: Record<Lang, string> = {
  nl: "Boeken & huren",
  fr: "Réserver & louer",
  en: "Book & rent",
};
const BOOK_NOW: Record<Lang, string> = {
  nl: "Online boeken",
  fr: "Réserver en ligne",
  en: "Book online",
};
const MEDIA_LABEL: Record<Lang, string> = {
  nl: "Onze media",
  fr: "Nos médias",
  en: "Our media",
};

const COMPOST_LABEL: Record<Lang, string> = {
  nl: "Buurtcompost",
  fr: "Compost de quartier",
  en: "Neighbourhood compost",
};


const COPY: Record<
  Lang,
  { supportedBy: string; city: string; and: string; design: string }
> = {
  nl: {
    supportedBy: "Met de steun van",
    city: "Stad Brussel",
    and: "Brusselse Stadslandbouw",
    design: "Ontwerp & Platform door",
  },
  fr: {
    supportedBy: "Avec le soutien de la",
    city: "Ville de Bruxelles",
    and: "Agriculture urbaine bruxelloise",
    design: "Conception & plateforme par",
  },
  en: {
    supportedBy: "With the support of the",
    city: "City of Brussels",
    and: "Brussels Urban Agriculture",
    design: "Design & platform by",
  },
};

export function SiteFooter() {
  const { t, lang } = useT();
  // Contactgegevens uit het portaal, met de vaste waarden als vangnet.
  const site = useSiteContact();
  const contactEmail = site.email || "contact@maximilien.brussels";
  const phoneDisplay = site.phone || PHONE;
  const phoneHref = phoneDisplay.replace(/[^\d+]/g, "");
  const addressLine = contactAddressLine(site);
  const c = COPY[lang];
  return (
    <footer className="relative z-0 mt-8 border-t border-border bg-[color:var(--surface-page)]/50 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_1fr]">
          {/* Linker merkblok */}
          <div className="min-w-0">
            <p className="font-serif text-2xl italic text-[color:var(--color-terracotta)]">
              {t("brand.name")}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
              {t("brand.tagline")}
            </p>
            <address className="mt-3 not-italic text-sm leading-relaxed text-foreground/80">
              <LocationLink />
            </address>

            <SocialCarousel />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <RoutBadge />
            </div>
          </div>

          {/* Rechter kolommen */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4">
            {/* Kolom: ontdekken */}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                {DISCOVER_TITLE[lang]}
              </p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-foreground/80">
                <LocalLink to={pathFor("about", lang)} className={LINK}>
                  {t("nav.about")}
                </LocalLink>
                <LocalLink to={pathFor("academy", lang)} className={LINK}>
                  {t("nav.academy")}
                </LocalLink>
                <LocalLink to={pathFor("shop", lang)} className={LINK}>
                  {t("nav.webshop")}
                </LocalLink>
                <LocalLink to={pathFor("support", lang)} className={LINK}>
                  {t("nav.support")}
                </LocalLink>
                <LocalLink to={pathFor("compost", lang)} className={LINK}>
                  {COMPOST_LABEL[lang]}
                </LocalLink>
                <LocalLink to={pathFor("social", lang)} className={LINK}>
                  {MEDIA_LABEL[lang]}
                </LocalLink>
                <LocalLink to={pathFor("events", lang)} className={LINK}>
                  {{ nl: "Kalender", fr: "Agenda", en: "Calendar" }[lang]}
                </LocalLink>
              </nav>
            </div>

            {/* Kolom: boeken & huren */}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                {BOOK_TITLE[lang]}
              </p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-foreground/80">
                {(
                  [
                    ["animations", { nl: "Schoolanimaties", fr: "Animations scolaires", en: "School activities" }],
                    ["camps", { nl: "Vakantiestages", fr: "Stages de vacances", en: "Holiday camps" }],
                    ["rental", { nl: "Zalen huren", fr: "Location de salles", en: "Venue rental" }],
                    ["teambuilding", { nl: "Teambuilding", fr: "Team building", en: "Team building" }],
                    ["seminars", { nl: "Seminaries", fr: "Séminaires", en: "Seminars" }],
                  ] as const
                ).map(([key, label]) => (
                  <LocalLink key={key} to={pathFor(key, lang)} className={LINK}>
                    {label[lang]}
                  </LocalLink>
                ))}
                <Link to="/boeking" className={LINK}>
                  {BOOK_NOW[lang]}
                </Link>
              </nav>
            </div>

            {/* Kolom: contact */}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                {t("footer.contact")}
              </p>
              <p className="mt-3 break-words text-sm text-foreground/80">
                <a href={`mailto:${contactEmail}`} className={LINK}>
                  {contactEmail}
                </a>
                <br />
                <a href={`tel:${phoneHref}`} className={LINK}>
                  {phoneDisplay}
                </a>
                <br />
                <span className="text-foreground/70">{addressLine}</span>
              </p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-foreground/80">
                <LocalLink to={pathFor("contact", lang)} className={LINK}>
                  {t("footer.contactLink")}
                </LocalLink>
                <LocalLink to={pathFor("faq", lang)} className={LINK}>
                  {{ nl: "Veelgestelde vragen", fr: "Questions fréquentes", en: "FAQ" }[lang]}
                </LocalLink>
                <LocalLink to={pathFor("press", lang)} className={LINK}>
                  {{ nl: "Pers & mediakit", fr: "Presse & kit média", en: "Press & media kit" }[lang]}
                </LocalLink>
              </nav>
            </div>

            {/* Kolom: partners & steun */}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                {t("footer.partners")}
              </p>
              <nav className="mt-3 flex flex-col gap-2 text-sm text-foreground/80">
                <LocalLink to={pathFor("partners", lang)} className={LINK}>
                  {t("footer.ourPartners")}
                </LocalLink>
                <LocalLink to="/word-partner" className={LINK}>
                  {t("footer.becomePartner")}
                </LocalLink>
              </nav>
            </div>
          </div>
        </div>
      </div>


      {/* Subtiele onderregel */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-[11px] text-foreground/60 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>
            {c.supportedBy}{" "}
            <a
              href="https://www.brussel.be"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground/75 hover:text-[color:var(--color-terracotta)]"
            >
              {c.city}
            </a>{" "}
            &amp;{" "}
            <a
              href="https://goodfood.brussels"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground/75 hover:text-[color:var(--color-terracotta)]"
            >
              {c.and}
            </a>
          </p>
          <p>
            {c.design}{" "}
            <a
              href="https://delplanche.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground/75 hover:text-[color:var(--color-terracotta)]"
            >
              Delplanche
            </a>
          </p>
        </div>
      </div>

      <div className="border-t border-border py-4 text-center text-[11px] uppercase tracking-[0.25em] text-foreground/70">
        {/* Statische copyrightregel — geen verborgen doorverwijzing naar het beheerportaal. */}
        <p>
          © 2026 Ferme du Parc Maximilien.{" "}
          {{
            nl: "Alle rechten voorbehouden.",
            fr: "Tous droits réservés.",
            en: "All rights reserved.",
          }[lang]}
        </p>
      </div>

    </footer>
  );
}
