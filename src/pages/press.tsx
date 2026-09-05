/**
 * Persruimte / Espace presse / Press room.
 * Downloadbare logo's in verschillende formaten en kleurvarianten, merkkleuren,
 * persfoto's (met uitsnede op maat), kerncijfers, standaardtekst, webbanners,
 * link-previews, persberichten en het perscontact.
 */
import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Package,
  Phone,
  Quote,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { SITE_URL } from "@/lib/routes-i18n";
import { PhotoCropperModal } from "@/components/press/PhotoCropperModal";
import { PartnerBanners } from "@/components/press/PartnerBanners";
import { OpenGraphGenerator } from "@/components/press/OpenGraphGenerator";

import fotoErf from "@/assets/foto/foto-erf-pad.jpg.asset.json";
import fotoMoestuin from "@/assets/foto/foto-moestuin-bakken.jpg.asset.json";
import sfeerKinderenAsset from "@/assets/sfeer-kinderen-zaden.jpg.asset.json";
const sfeerKinderen = sfeerKinderenAsset.url;
import fotoTrojaansPaard from "@/assets/foto/foto-trojaans-paard.jpg.asset.json";
import fotoGeiten from "@/assets/foto/foto-geiten-groep.jpg.asset.json";
import fotoAlpacas from "@/assets/foto/foto-alpacas-twee.jpg.asset.json";
import fotoPauw from "@/assets/foto/foto-pauw-pronkend.jpg.asset.json";
import { handleImageError } from "@/lib/image-fallback";

type Lang = "nl" | "fr" | "en";
type T3 = Record<Lang, string>;

const PRESS_EMAIL = "pers@maximilien.brussels";
const PRESS_PHONE = "+32 2 201 56 09";
const PHOTOS_ZIP = "/pers/persfotos-maximilien.zip";

const COPY = {
  eyebrow: { nl: "Persruimte", fr: "Espace presse", en: "Press room" } as T3,
  title: {
    nl: "Pers & mediakit",
    fr: "Presse & kit média",
    en: "Press & media kit",
  } as T3,
  lede: {
    nl: "Alles wat journalisten, partners en scholen nodig hebben om over de stadsboerderij te berichten: logo's in verschillende formaten, merkkleuren, persfoto's, kerncijfers en onze woordvoering.",
    fr: "Tout ce dont les journalistes, partenaires et écoles ont besoin pour parler de la ferme urbaine : logos en plusieurs formats, couleurs de marque, photos de presse, chiffres clés et contacts presse.",
    en: "Everything journalists, partners and schools need to cover the city farm: logos in several formats, brand colours, press photos, key figures and our press contacts.",
  } as T3,
  logosTitle: { nl: "Logo's", fr: "Logos", en: "Logos" } as T3,
  logosLede: {
    nl: "Gebruik het logo altijd ongewijzigd, met voldoende vrije ruimte rondom (minstens de hoogte van de 'm') en nooit uitgerekt, gedraaid of van een schaduw voorzien.",
    fr: "Utilisez toujours le logo tel quel, avec une zone de protection suffisante (au moins la hauteur du « m »), sans l'étirer, le pivoter ni lui ajouter d'ombre.",
    en: "Always use the logo unmodified, with enough clear space around it (at least the height of the 'm'), never stretched, rotated or with added shadows.",
  } as T3,
  colorsTitle: { nl: "Merkkleuren", fr: "Couleurs de marque", en: "Brand colours" } as T3,
  photosTitle: { nl: "Persfoto's", fr: "Photos de presse", en: "Press photos" } as T3,
  photosLede: {
    nl: "Vrij te gebruiken in redactionele context, met bronvermelding “© La Ferme du Parc Maximilien”.",
    fr: "Libres d'utilisation en contexte rédactionnel, avec la mention « © La Ferme du Parc Maximilien ».",
    en: "Free for editorial use with the credit “© La Ferme du Parc Maximilien”.",
  } as T3,
  photosZip: {
    nl: "Download alle persfoto's (ZIP — hoge resolutie)",
    fr: "Télécharger toutes les photos (ZIP — haute résolution)",
    en: "Download all press photos (ZIP — high res)",
  } as T3,
  customDownload: {
    nl: "Download op maat",
    fr: "Sur mesure",
    en: "Custom download",
  } as T3,
  factsTitle: { nl: "Kerncijfers", fr: "Chiffres clés", en: "Key figures" } as T3,
  boilerplateTitle: {
    nl: "Standaard beschrijving van de boerderij",
    fr: "Description standard de la ferme",
    en: "Standard description of the farm",
  } as T3,
  contactTitle: { nl: "Perscontact", fr: "Contact presse", en: "Press contact" } as T3,
  contactLede: {
    nl: "Voor interviews, opnames op het erf of extra beeldmateriaal.",
    fr: "Pour les interviews, tournages à la ferme ou visuels supplémentaires.",
    en: "For interviews, filming on site or additional visuals.",
  } as T3,
  download: { nl: "Download", fr: "Télécharger", en: "Download" } as T3,
  zip: {
    nl: "Volledig logopakket (ZIP · SVG, PNG, JPG)",
    fr: "Kit logo complet (ZIP · SVG, PNG, JPG)",
    en: "Full logo kit (ZIP · SVG, PNG, JPG)",
  } as T3,
  copy: { nl: "Kopieer", fr: "Copier", en: "Copy" } as T3,
  copied: { nl: "Gekopieerd", fr: "Copié", en: "Copied" } as T3,
  copyText: {
    nl: "Kopieer tekst",
    fr: "Copier le texte",
    en: "Copy text",
  } as T3,
  copyQuote: {
    nl: "Kopieer citaat",
    fr: "Copier la citation",
    en: "Copy quote",
  } as T3,
  releasesTitle: { nl: "Persberichten", fr: "Communiqués de presse", en: "Press releases" } as T3,
  releasesLede: {
    nl: "Onze recentste persberichten in PDF.",
    fr: "Nos communiqués les plus récents en PDF.",
    en: "Our most recent press releases in PDF.",
  } as T3,
  quoteTitle: {
    nl: "Citaat voor de pers",
    fr: "Citation pour la presse",
    en: "Quote for the press",
  } as T3,
  mediaTitle: { nl: "In de media", fr: "Dans les médias", en: "In the media" } as T3,
  usage: {
    nl: "Gebruiksvoorwaarden: logo's en foto's mogen gebruikt worden voor redactionele en informatieve doeleinden. Commercieel gebruik of gebruik dat een samenwerking suggereert vraagt onze schriftelijke toestemming.",
    fr: "Conditions d'utilisation : logos et photos peuvent être utilisés à des fins rédactionnelles et informatives. Tout usage commercial ou laissant supposer un partenariat requiert notre accord écrit.",
    en: "Terms of use: logos and photos may be used for editorial and informational purposes. Commercial use, or use suggesting a partnership, requires our written consent.",
  } as T3,
};

const NAV_PILLS: { href: string; icon: string; label: T3 }[] = [
  { href: "#kerncijfers", icon: "📊", label: COPY.factsTitle },
  { href: "#logos", icon: "🎨", label: COPY.logosTitle },
  { href: "#kleuren", icon: "🎨", label: COPY.colorsTitle },
  { href: "#fotos", icon: "📷", label: COPY.photosTitle },
  { href: "#tekst", icon: "📝", label: COPY.boilerplateTitle },
  { href: "#contact", icon: "✉️", label: COPY.contactTitle },
];

const LOGO_VARIANTS: {
  id: string;
  name: T3;
  note: T3;
  preview: string;
  previewBg: string;
  files: { label: string; href: string }[];
}[] = [
  {
    id: "terracotta",
    name: {
      nl: "Hoofdlogo — terracotta",
      fr: "Logo principal — terracotta",
      en: "Primary — terracotta",
    },
    note: {
      nl: "Voor lichte achtergronden (crème, wit, papier).",
      fr: "Pour fonds clairs (crème, blanc, papier).",
      en: "For light backgrounds (cream, white, paper).",
    },
    preview: "/pers/logo-maximilien-terracotta-500px.png",
    previewBg: "var(--color-cream, #F7F3EB)",
    files: [
      { label: "SVG", href: "/pers/logo-maximilien-terracotta.svg" },
      { label: "PNG 250 px", href: "/pers/logo-maximilien-terracotta-250px.png" },
      { label: "PNG 500 px", href: "/pers/logo-maximilien-terracotta-500px.png" },
      { label: "PNG 1000 px", href: "/pers/logo-maximilien-terracotta-1000px.png" },
      { label: "JPG op crème", href: "/pers/logo-maximilien-op-creme-1000px.jpg" },
    ],
  },
  {
    id: "wit",
    name: {
      nl: "Wit — voor donkere achtergronden",
      fr: "Blanc — pour fonds foncés",
      en: "White — for dark backgrounds",
    },
    note: {
      nl: "Voor foto's, bosgroene vlakken en video.",
      fr: "Pour photos, aplats vert forêt et vidéo.",
      en: "For photos, forest-green blocks and video.",
    },
    preview: "/pers/logo-maximilien-wit-500px.png",
    previewBg: "#1D3528",
    files: [
      { label: "SVG", href: "/pers/logo-maximilien-wit.svg" },
      { label: "PNG 250 px", href: "/pers/logo-maximilien-wit-250px.png" },
      { label: "PNG 500 px", href: "/pers/logo-maximilien-wit-500px.png" },
      { label: "PNG 1000 px", href: "/pers/logo-maximilien-wit-1000px.png" },
      { label: "JPG op bosgroen", href: "/pers/logo-maximilien-op-bosgroen-1000px.jpg" },
    ],
  },
  {
    id: "bosgroen",
    name: { nl: "Bosgroen", fr: "Vert forêt", en: "Forest green" },
    note: {
      nl: "Voor rustige, eenkleurige toepassingen.",
      fr: "Pour des applications sobres, monochromes.",
      en: "For calm, single-colour applications.",
    },
    preview: "/pers/logo-maximilien-bosgroen-500px.png",
    previewBg: "#F7F3EB",
    files: [
      { label: "SVG", href: "/pers/logo-maximilien-bosgroen.svg" },
      { label: "PNG 250 px", href: "/pers/logo-maximilien-bosgroen-250px.png" },
      { label: "PNG 500 px", href: "/pers/logo-maximilien-bosgroen-500px.png" },
      { label: "PNG 1000 px", href: "/pers/logo-maximilien-bosgroen-1000px.png" },
    ],
  },
  {
    id: "zwart",
    name: { nl: "Zwart — drukwerk", fr: "Noir — impression", en: "Black — print" },
    note: {
      nl: "Voor zwart-witdruk, fax, stempels en krantenpapier.",
      fr: "Pour impression N/B, tampons et papier journal.",
      en: "For black-and-white print, stamps and newsprint.",
    },
    preview: "/pers/logo-maximilien-zwart-500px.png",
    previewBg: "#FFFFFF",
    files: [
      { label: "SVG", href: "/pers/logo-maximilien-zwart.svg" },
      { label: "PNG 250 px", href: "/pers/logo-maximilien-zwart-250px.png" },
      { label: "PNG 500 px", href: "/pers/logo-maximilien-zwart-500px.png" },
      { label: "PNG 1000 px", href: "/pers/logo-maximilien-zwart-1000px.png" },
    ],
  },
];

const ICON_FILES: { label: T3; href: string; size: string }[] = [
  {
    label: { nl: "Social avatar", fr: "Avatar réseaux", en: "Social avatar" },
    href: "/pers/logo-maximilien-avatar-1000x1000.jpg",
    size: "1000 × 1000 px",
  },
  {
    label: { nl: "App-icoon", fr: "Icône d'app", en: "App icon" },
    href: "/icons/pwa-512x512.png",
    size: "512 × 512 px",
  },
  {
    label: { nl: "Apple touch-icoon", fr: "Icône Apple touch", en: "Apple touch icon" },
    href: "/icons/apple-touch-icon.png",
    size: "180 × 180 px",
  },
  { label: { nl: "Favicon", fr: "Favicon", en: "Favicon" }, href: "/favicon.png", size: "PNG" },
];

const COLORS: { name: string; hex: string; use: T3 }[] = [
  {
    name: "Bosgroen",
    hex: "#1D3528",
    use: {
      nl: "Basiskleur, vlakken en tekst",
      fr: "Couleur de base, aplats et texte",
      en: "Base colour, blocks and text",
    },
  },
  {
    name: "Terracotta",
    hex: "#C15C3A",
    use: {
      nl: "Accenten, knoppen en logo",
      fr: "Accents, boutons et logo",
      en: "Accents, buttons and logo",
    },
  },
  {
    name: "Crème",
    hex: "#F7F3EB",
    use: { nl: "Achtergronden en papier", fr: "Fonds et papier", en: "Backgrounds and paper" },
  },
  {
    name: "Salie",
    hex: "#9CB29B",
    use: {
      nl: "Randen en rustige vlakken",
      fr: "Bordures et aplats doux",
      en: "Borders and soft blocks",
    },
  },
];

const PHOTOS: { src: string; caption: T3 }[] = [
  {
    src: fotoErf.url,
    caption: {
      nl: "Het erf met de woontorens op de achtergrond",
      fr: "La cour et les tours en arrière-plan",
      en: "The farmyard with the towers behind",
    },
  },
  {
    src: fotoMoestuin.url,
    caption: {
      nl: "De moestuin in volle zomer",
      fr: "Le potager en plein été",
      en: "The kitchen garden in high summer",
    },
  },
  {
    src: sfeerKinderen,
    caption: {
      nl: "Kinderen zaaien tijdens een animatie",
      fr: "Des enfants sèment pendant une animation",
      en: "Children sowing during an activity",
    },
  },
  {
    src: fotoGeiten.url,
    caption: { nl: "Onze geiten", fr: "Nos chèvres", en: "Our goats" },
  },
  {
    src: fotoAlpacas.url,
    caption: { nl: "De alpaca's", fr: "Les alpagas", en: "The alpacas" },
  },
  {
    src: fotoPauw.url,
    caption: {
      nl: "Onze pauw pronkt",
      fr: "Notre paon fait la roue",
      en: "Our peacock displaying",
    },
  },
  {
    src: fotoTrojaansPaard.url,
    caption: {
      nl: "Het houten paard op het erf",
      fr: "Le cheval en bois dans la cour",
      en: "The wooden horse in the yard",
    },
  },
];

const FACTS: { value: string; label: T3 }[] = [
  { value: "1996", label: { nl: "Opgericht", fr: "Fondée en", en: "Founded" } },
  {
    value: "1 ha",
    label: { nl: "Boerderij in de stad", fr: "De ferme en ville", en: "Of farm in the city" },
  },
  {
    value: "~120",
    label: { nl: "Dieren op het erf", fr: "Animaux à la ferme", en: "Animals on the farm" },
  },
  {
    value: "10.000+",
    label: { nl: "Bezoekers per jaar", fr: "Visiteurs par an", en: "Visitors a year" },
  },
];

const RELEASES: { href: string; name: T3; date: string }[] = [
  {
    href: "/pers/persberichten/persbericht-nieuwe-moestuin-2026.pdf",
    date: "2026",
    name: {
      nl: "Persbericht — nieuwe moestuin 2026",
      fr: "Communiqué — nouveau potager 2026",
      en: "Press release — new kitchen garden 2026",
    },
  },
  {
    href: "/pers/persberichten/persbericht-jaarverslag.pdf",
    date: "2025",
    name: {
      nl: "Persbericht — jaarverslag",
      fr: "Communiqué — rapport annuel",
      en: "Press release — annual report",
    },
  },
];

const QUOTE: T3 = {
  nl: "Laat stadsbewoners in het hart van Brussel opnieuw verbinding maken met de natuur, de dieren en elkaar. Onze boerderij is een ademruimte voor de hele stad.",
  fr: "Permettre aux habitants du cœur de Bruxelles de renouer avec la nature, les animaux et les autres. Notre ferme est un espace de respiration pour toute la ville.",
  en: "Letting people in the heart of Brussels reconnect with nature, with the animals and with each other. Our farm is a breathing space for the whole city.",
};

const QUOTE_SOURCE: T3 = {
  nl: "— Woordvoering / directie La Ferme du Parc Maximilien",
  fr: "— Porte-parole / direction La Ferme du Parc Maximilien",
  en: "— Spokesperson / management, La Ferme du Parc Maximilien",
};

const MEDIA_OUTLETS = ["BRUZZ", "BX1", "RTBF", "LE SOIR", "DE STANDAARD"];

const BOILERPLATE: T3 = {
  nl: "La Ferme du Parc Maximilien is een stadsboerderij en sociale onderneming in hartje Brussel, pal naast het Noordstation. Op één hectare tussen de woontorens leven zo'n 120 dieren, groeit een moestuin en draait een buurtcompost. De vzw combineert dierenwelzijn en stadslandbouw met educatie, socioprofessionele inschakeling en vrijwilligerswerk: schoolanimaties, vakantiestages, verjaardagen, teambuilding en zaalverhuur maken de werking mogelijk. De boerderij is gratis toegankelijk voor iedereen.",
  fr: "La Ferme du Parc Maximilien est une ferme urbaine et une entreprise sociale au cœur de Bruxelles, juste à côté de la gare du Nord. Sur un hectare entre les tours vivent quelque 120 animaux, avec un potager et un compost de quartier. L'ASBL allie bien-être animal et agriculture urbaine à l'éducation, l'insertion socioprofessionnelle et le bénévolat : animations scolaires, stages, anniversaires, teambuilding et location de salles font vivre le projet. La ferme est accessible gratuitement à toutes et tous.",
  en: "La Ferme du Parc Maximilien is a city farm and social enterprise in the heart of Brussels, right next to the North Station. On one hectare between the tower blocks live some 120 animals, alongside a kitchen garden and a neighbourhood compost. The non-profit combines animal welfare and urban agriculture with education, work integration and volunteering: school activities, holiday camps, birthdays, team building and venue rental keep the project running. The farm is free to visit for everyone.",
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy(value: string, id: string, message: string) {
      void navigator.clipboard.writeText(value).then(() => {
        setCopied(id);
        toast.success(message);
        window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
      });
    },
  };
}

const CARD =
  "rounded-3xl border border-border bg-[color:var(--surface-page)] p-6 shadow-[0_1px_0_rgba(0,0,0,0.03)]";
const DARK_CARD = "rounded-3xl border border-white/12 bg-white/[0.06] p-6";
const SECTION_TITLE = "font-serif text-2xl text-[color:var(--ink-forest)] md:text-3xl";
const SECTION_TITLE_LIGHT = "font-serif text-2xl text-[color:var(--color-cream)] md:text-3xl";
const DOWNLOAD_BTN =
  "inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border px-4 text-xs font-medium text-foreground/80 transition-colors hover:border-[color:var(--color-terracotta)] hover:text-[color:var(--color-terracotta)]";
const DOWNLOAD_BTN_LIGHT =
  "inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/25 px-4 text-xs font-medium text-[color:var(--color-cream)]/85 transition-colors hover:border-white hover:text-white";

export function PressPage() {
  const { lang } = useT();
  const l = lang as Lang;
  const { copied, copy } = useCopy();
  const [cropper, setCropper] = useState<{ src: string; alt: string } | null>(null);

  return (
    <main className="bg-background">
      {/* Hero + kerncijfers op bosgroen */}
      <section className="border-b border-border bg-[color:var(--surface-forest,#1D3528)] px-4 py-16 text-[color:var(--color-cream)] md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--color-terracotta)]">
            {COPY.eyebrow[l]}
          </p>
          <h1 className="mt-4 font-serif text-4xl italic md:text-5xl">{COPY.title[l]}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed opacity-90">{COPY.lede[l]}</p>

          {/* Sprongnavigatie */}
          <nav className="mt-8 flex flex-wrap gap-2.5" aria-label={COPY.title[l]}>
            {NAV_PILLS.map((p) => (
              <a key={p.href} href={p.href} className={DOWNLOAD_BTN_LIGHT}>
                <span aria-hidden>{p.icon}</span> {p.label[l]}
              </a>
            ))}
          </nav>

          {/* Kerncijfers */}
          <section id="kerncijfers" className="mt-12 scroll-mt-24">
            <h2 className={SECTION_TITLE_LIGHT}>{COPY.factsTitle[l]}</h2>
            <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {FACTS.map((f) => (
                <div key={f.value} className={`${DARK_CARD} text-center`}>
                  <dt className="font-serif text-3xl text-[color:var(--color-terracotta)]">
                    {f.value}
                  </dt>
                  <dd className="mt-2 text-xs uppercase tracking-[0.18em] text-[color:var(--color-cream)]/70">
                    {f.label[l]}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </section>

      {/* Logo's + merkkleuren op bosgroen met donkere kaarten */}
      <div className="bg-[color:var(--surface-forest,#1D3528)] px-4 py-16 text-[color:var(--color-cream)] md:px-8">
        <div className="mx-auto max-w-5xl space-y-16">
          {/* Logo's */}
          <section id="logos" className="scroll-mt-24">
            <h2 className={SECTION_TITLE_LIGHT}>{COPY.logosTitle[l]}</h2>
            <p className="mt-3 max-w-3xl text-sm text-[color:var(--color-cream)]/75">
              {COPY.logosLede[l]}
            </p>
            <a
              href="/pers/maximilien-logopakket.zip"
              download
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-terracotta)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-cream)] shadow-sm transition hover:opacity-90"
            >
              <Download className="h-4 w-4" /> {COPY.zip[l]}
            </a>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {LOGO_VARIANTS.map((v) => (
                <article key={v.id} className={DARK_CARD}>
                  <div
                    className="flex h-40 items-center justify-center rounded-2xl border border-white/12"
                    style={{ background: v.previewBg }}
                  >
                    <img
                      onError={handleImageError}
                      src={v.preview}
                      alt={v.name[l]}
                      className="h-20 w-auto"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="mt-4 font-serif text-lg text-[color:var(--color-cream)]">
                    {v.name[l]}
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--color-cream)]/70">{v.note[l]}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {v.files.map((f) => (
                      <a key={f.href} href={f.href} download className={DOWNLOAD_BTN_LIGHT}>
                        <Download className="h-3.5 w-3.5" /> {f.label}
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {/* Iconen en avatars */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ICON_FILES.map((icon) => (
                <a
                  key={icon.href}
                  href={icon.href}
                  download
                  className={`${DARK_CARD} flex items-center gap-4 transition-colors hover:border-white/40`}
                >
                  <img
                    onError={handleImageError}
                    src={icon.href}
                    alt={icon.label[l]}
                    className="h-12 w-12 rounded-lg object-contain"
                    loading="lazy"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[color:var(--color-cream)]">
                      {icon.label[l]}
                    </span>
                    <span className="block text-xs text-[color:var(--color-cream)]/65">
                      {icon.size}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          {/* Merkkleuren */}
          <section id="kleuren" className="scroll-mt-24">
            <h2 className={SECTION_TITLE_LIGHT}>{COPY.colorsTitle[l]}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => copy(c.hex, c.hex, `${c.hex} — ${COPY.copied[l]}`)}
                  className={`${DARK_CARD} text-left transition-colors hover:border-white/40`}
                >
                  <span
                    className="block h-20 w-full rounded-2xl border border-white/20"
                    style={{ background: c.hex }}
                  />
                  <span className="mt-3 block text-sm font-medium text-[color:var(--color-cream)]">
                    {c.name}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-2 font-mono text-xs uppercase text-[color:var(--color-cream)]/70">
                    {c.hex}
                    {copied === c.hex ? (
                      <Check className="h-3.5 w-3.5 text-[color:var(--color-terracotta)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="mt-2 block text-xs text-[color:var(--color-cream)]/65">
                    {c.use[l]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Persfoto's, banners en link-previews op neutrale achtergrond */}
      <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 md:px-8">
        {/* Persfoto's */}
        <section id="fotos" className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className={SECTION_TITLE}>{COPY.photosTitle[l]}</h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{COPY.photosLede[l]}</p>
            </div>
            <a
              href={PHOTOS_ZIP}
              download
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-terracotta)] px-5 py-3 text-sm font-semibold text-[color:var(--color-cream)] shadow-sm transition hover:opacity-90"
            >
              <Package className="h-4 w-4" /> 📦 {COPY.photosZip[l]}
            </a>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PHOTOS.map((p) => (
              <figure
                key={p.src}
                className="overflow-hidden rounded-3xl border border-border bg-card"
              >
                <img
                  onError={handleImageError}
                  src={p.src}
                  alt={p.caption[l]}
                  className="aspect-[4/3] w-full object-cover object-[50%_40%]"
                  loading="lazy"
                />
                <figcaption className="space-y-3 p-4">
                  <span className="block text-xs text-muted-foreground">{p.caption[l]}</span>
                  <span className="flex flex-wrap gap-2">
                    <a href={p.src} download className={DOWNLOAD_BTN}>
                      <Download className="h-3.5 w-3.5" /> {COPY.download[l]}
                    </a>
                    <button
                      type="button"
                      onClick={() => setCropper({ src: p.src, alt: p.caption[l] })}
                      className={DOWNLOAD_BTN}
                    >
                      <Sliders className="h-3.5 w-3.5" /> {COPY.customDownload[l]}
                    </button>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Webbanners & partnerkit */}
        <PartnerBanners lang={l} />

        {/* Link-previews / Open Graph */}
        <OpenGraphGenerator lang={l} />

        {/* In de media */}
        <section aria-label={COPY.mediaTitle[l]}>
          <h2 className={SECTION_TITLE}>{COPY.mediaTitle[l]}</h2>
          <ul className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4 opacity-60">
            {MEDIA_OUTLETS.map((m) => (
              <li
                key={m}
                className="font-serif text-lg uppercase tracking-[0.18em] text-[color:var(--ink-forest)] grayscale"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Standaardtekst, persberichten, citaat en contact op crème */}
      <div className="bg-[#F7F3EB] px-4 py-16 md:px-8">
        <div className="mx-auto max-w-5xl space-y-16 text-[#1D3528]">
          {/* Standaard beschrijving */}
          <section id="tekst" className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-[#1D3528] md:text-3xl">
              {COPY.boilerplateTitle[l]}
            </h2>
            <div className="mt-6 rounded-3xl border border-[#1D3528]/12 bg-white/70 p-6">
              <p className="text-sm leading-relaxed text-[#1D3528]/90">{BOILERPLATE[l]}</p>
              <button
                type="button"
                onClick={() => copy(BOILERPLATE[l], "boiler", COPY.copied[l])}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#1D3528]/20 px-4 text-xs font-medium text-[#1D3528] transition-colors hover:border-[color:var(--color-terracotta)] hover:text-[color:var(--color-terracotta)]"
              >
                {copied === "boiler" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}{" "}
                {COPY.copyText[l]}
              </button>
            </div>
          </section>

          {/* Citaat voor de pers */}
          <section aria-label={COPY.quoteTitle[l]}>
            <h2 className="font-serif text-2xl text-[#1D3528] md:text-3xl">{COPY.quoteTitle[l]}</h2>
            <blockquote className="mt-6 rounded-3xl border-l-4 border-[color:var(--color-terracotta)] bg-white/70 p-6">
              <Quote className="h-5 w-5 text-[color:var(--color-terracotta)]" aria-hidden />
              <p className="mt-3 font-serif text-lg italic leading-relaxed text-[#1D3528]">
                “{QUOTE[l]}”
              </p>
              <footer className="mt-3 text-xs uppercase tracking-[0.16em] text-[#1D3528]/70">
                {QUOTE_SOURCE[l]}
              </footer>
              <button
                type="button"
                onClick={() =>
                  copy(`“${QUOTE[l]}” ${QUOTE_SOURCE[l]}`, "quote", COPY.copied[l])
                }
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#1D3528]/20 px-4 text-xs font-medium text-[#1D3528] transition-colors hover:border-[color:var(--color-terracotta)] hover:text-[color:var(--color-terracotta)]"
              >
                {copied === "quote" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}{" "}
                {COPY.copyQuote[l]}
              </button>
            </blockquote>
          </section>

          {/* Persberichten */}
          <section id="persberichten" className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-[#1D3528] md:text-3xl">
              {COPY.releasesTitle[l]}
            </h2>
            <p className="mt-3 text-sm text-[#1D3528]/70">{COPY.releasesLede[l]}</p>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {RELEASES.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    download
                    className="flex items-center gap-4 rounded-3xl border border-[#1D3528]/12 bg-white/70 p-5 transition-colors hover:border-[color:var(--color-terracotta)]"
                  >
                    <FileText className="h-6 w-6 shrink-0 text-[color:var(--color-terracotta)]" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#1D3528]">{r.name[l]}</span>
                      <span className="block text-xs text-[#1D3528]/60">PDF · {r.date}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Perscontact */}
          <section id="contact" className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-[#1D3528] md:text-3xl">
              {COPY.contactTitle[l]}
            </h2>
            <p className="mt-3 text-sm text-[#1D3528]/70">{COPY.contactLede[l]}</p>
            <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-[#1D3528]/12 bg-white/70 p-6 text-sm">
              <a
                href={`mailto:${PRESS_EMAIL}`}
                className="inline-flex items-center gap-2 text-[#1D3528] hover:text-[color:var(--color-terracotta)]"
              >
                <Mail className="h-4 w-4" /> {PRESS_EMAIL}
              </a>
              <a
                href="tel:+3222015609"
                className="inline-flex items-center gap-2 text-[#1D3528] hover:text-[color:var(--color-terracotta)]"
              >
                <Phone className="h-4 w-4" /> {PRESS_PHONE}
              </a>
              <a
                href="https://www.openstreetmap.org/?mlat=50.8636&mlon=4.3560#map=17/50.8636/4.3560"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#1D3528] hover:text-[color:var(--color-terracotta)]"
              >
                <ExternalLink className="h-4 w-4" /> Quai du Batelage 2, 1000 Brussel
              </a>
              <span className="font-mono text-xs text-[#1D3528]/60">{SITE_URL}</span>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-[#1D3528]/70">{COPY.usage[l]}</p>
          </section>
        </div>
      </div>

      <PhotoCropperModal
        open={cropper !== null}
        src={cropper?.src ?? ""}
        alt={cropper?.alt ?? ""}
        lang={l}
        onClose={() => setCropper(null)}
      />
    </main>
  );
}
