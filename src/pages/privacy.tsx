import { Link } from "@tanstack/react-router";
import { NavHeader } from "@/components/NavHeader";
import { LocalLink } from "@/components/LocalLink";
import { pathFor } from "@/lib/routes-i18n";
import { useT } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Section = { title: string; body: string[] };

const COPY: Record<
  Lang,
  {
    title: string;
    heading: string;
    intro: string;
    sections: Section[];
    questions: string;
    contact: string;
  }
> = {
  nl: {
    title: "Privacy",
    heading: "Privacybeleid",
    intro:
      "De stadsboerderij verwerkt zo weinig mogelijk persoonsgegevens. Geen tracking, geen reclame, geen doorverkoop — enkel wat nodig is om je verder te helpen.",
    sections: [
      {
        title: "Welke gegevens verzamelen we?",
        body: [
          "Enkel wat je zelf doorgeeft: je naam en e-mailadres bij een contactaanvraag, bestelling, gift of academy-certificaat. Bij een bestelling bewaren we ook de producten en het gekozen afhaalmoment.",
          "We gebruiken geen trackingpixels, geen advertentiecookies en geen externe analysediensten.",
        ],
      },
      {
        title: "Waarvoor gebruiken we ze?",
        body: [
          "Om je bericht te beantwoorden, je bestelling klaar te zetten, je gift te bevestigen of je certificaat te bezorgen. Niets meer.",
          "Onze e-mails bevatten geen reclame en geen leesbevestigingen.",
        ],
      },
      {
        title: "Waar staan je gegevens?",
        body: [
          "In een beveiligde databank binnen de Europese Unie, met toegangsregels per rol. E-mails vertrekken via een Europese mailserver.",
          "We verkopen of delen je gegevens nooit met derden voor commerciële doeleinden.",
        ],
      },
      {
        title: "Hoe lang bewaren we ze?",
        body: [
          "Contactberichten: maximaal 2 jaar. Bestellingen en giften: zolang de boekhoudkundige bewaarplicht loopt. Certificaten blijven aan je account gekoppeld zolang je het behoudt.",
        ],
      },
      {
        title: "Jouw rechten",
        body: [
          "Je hebt recht op inzage, verbetering, verwijdering en overdracht van je gegevens, en je kan bezwaar maken tegen de verwerking.",
          "Stuur je vraag naar contact@maximilien.brussels — we antwoorden binnen 30 dagen. Ben je niet tevreden, dan kan je terecht bij de Gegevensbeschermingsautoriteit (gegevensbeschermingsautoriteit.be).",
        ],
      },
    ],
    questions: "Vragen over je gegevens?",
    contact: "Neem contact op",
  },
  fr: {
    title: "Confidentialité",
    heading: "Politique de confidentialité",
    intro:
      "La ferme urbaine traite le moins de données personnelles possible. Pas de suivi, pas de publicité, pas de revente — uniquement ce qui est nécessaire pour vous aider.",
    sections: [
      {
        title: "Quelles données recueillons-nous ?",
        body: [
          "Uniquement ce que vous nous transmettez vous-même : votre nom et adresse e-mail lors d'une demande de contact, d'une commande, d'un don ou d'un certificat de l'académie. Pour une commande, nous conservons aussi les produits et le créneau de retrait choisi.",
          "Nous n'utilisons ni pixels de suivi, ni cookies publicitaires, ni services d'analyse externes.",
        ],
      },
      {
        title: "À quoi servent-elles ?",
        body: [
          "À répondre à votre message, préparer votre commande, confirmer votre don ou vous délivrer votre certificat. Rien de plus.",
          "Nos e-mails ne contiennent ni publicité ni accusés de lecture.",
        ],
      },
      {
        title: "Où sont stockées vos données ?",
        body: [
          "Dans une base de données sécurisée au sein de l'Union européenne, avec des règles d'accès par rôle. Les e-mails partent via un serveur européen.",
          "Nous ne vendons ni ne partageons jamais vos données avec des tiers à des fins commerciales.",
        ],
      },
      {
        title: "Combien de temps les conservons-nous ?",
        body: [
          "Messages de contact : maximum 2 ans. Commandes et dons : le temps requis par les obligations comptables. Les certificats restent liés à votre compte tant que vous le conservez.",
        ],
      },
      {
        title: "Vos droits",
        body: [
          "Vous avez le droit de consulter, corriger, supprimer et récupérer vos données, et de vous opposer à leur traitement.",
          "Envoyez votre demande à contact@maximilien.brussels — nous répondons sous 30 jours. Si vous n'êtes pas satisfait, vous pouvez vous adresser à l'Autorité de protection des données (autoriteprotectiondonnees.be).",
        ],
      },
    ],
    questions: "Des questions sur vos données ?",
    contact: "Contactez-nous",
  },
  en: {
    title: "Privacy",
    heading: "Privacy policy",
    intro:
      "The city farm processes as little personal data as possible. No tracking, no advertising, no resale — only what's needed to help you.",
    sections: [
      {
        title: "What data do we collect?",
        body: [
          "Only what you give us: your name and e-mail address when making a contact request, order, donation or academy certificate. For an order, we also store the products and chosen pickup time.",
          "We do not use tracking pixels, advertising cookies or external analytics services.",
        ],
      },
      {
        title: "What do we use it for?",
        body: [
          "To answer your message, prepare your order, confirm your donation or deliver your certificate. Nothing more.",
          "Our e-mails contain no advertising and no read receipts.",
        ],
      },
      {
        title: "Where is your data stored?",
        body: [
          "In a secure database within the European Union, with role-based access rules. E-mails are sent via a European mail server.",
          "We never sell or share your data with third parties for commercial purposes.",
        ],
      },
      {
        title: "How long do we keep it?",
        body: [
          "Contact messages: maximum 2 years. Orders and donations: for as long as accounting retention rules require. Certificates stay linked to your account for as long as you keep it.",
        ],
      },
      {
        title: "Your rights",
        body: [
          "You have the right to access, correct, delete and transfer your data, and to object to its processing.",
          "Send your request to contact@maximilien.brussels — we reply within 30 days. If you're not satisfied, you can contact the Data Protection Authority (dataprotectionauthority.be).",
        ],
      },
    ],
    questions: "Questions about your data?",
    contact: "Get in touch",
  },
};

export function PrivacyPage() {
  const { lang } = useT();
  const c = COPY[lang];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-[color:var(--color-terracotta)]">
          {c.title}
        </p>
        <h1 className="font-serif mt-4 text-5xl leading-[0.95] tracking-tight text-[color:var(--ink-forest)] md:text-6xl">
          {c.heading}
        </h1>
        <p className="mt-6 text-base leading-relaxed text-foreground/75 md:text-lg">{c.intro}</p>

        <div className="mt-12 space-y-10">
          {c.sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-serif text-2xl italic text-[color:var(--color-terracotta)] md:text-3xl">
                {s.title}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="mt-3 text-sm leading-relaxed text-foreground/75 md:text-base">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-14 text-sm text-foreground/70">
          {c.questions}{" "}
          <LocalLink
            to={pathFor("contact", lang)}
            search={{ onderwerp: undefined }}
            className="underline underline-offset-4"
          >
            {c.contact}
          </LocalLink>
          .
        </p>
      </main>
    </div>
  );
}
