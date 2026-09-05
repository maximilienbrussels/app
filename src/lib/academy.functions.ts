import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";
import { db } from "@/lib/neon.server";
import { normalizePublicImageUrl } from "@/lib/s3.server";


type AcademyRow = {
  id: string;
  diersoort_naam: string;
  diersoort_naam_fr: string | null;
  diersoort_naam_en: string | null;
  slug: string;
  badge_icon: string | null;
  vragen_per_test: number;
  slaag_grens: number;
  beschrijving: string | null;
  beschrijving_fr: string | null;
  beschrijving_en: string | null;
};

// ---------- Publiek: lijst van actieve academies ----------
export const listAcademies = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = db();
    const rows = (await sql`
    select id, diersoort_naam, diersoort_naam_fr, diersoort_naam_en, slug, badge_icon,
           vragen_per_test, slaag_grens, beschrijving, beschrijving_fr, beschrijving_en,
           coalesce(categorie, 'algemeen') as categorie,
           coalesce(prioriteit, 0) as prioriteit, korte_code
      from academies
     where is_active = true and status = 'gepubliceerd'
     order by prioriteit nulls last, diersoort_naam
  `) as Array<AcademyRow & { categorie: string; prioriteit: number; korte_code: number | null }>;

    // Tel het werkelijke aantal vragen en modules per academy (dynamische kaarttekst).
    const vragen = (await sql`select academy_id, module from academy_vragen`) as Array<{
      academy_id: string;
      module: number | null;
    }>;

    const stats = new Map<string, { total: number; modules: Set<number> }>();
    for (const v of vragen ?? []) {
      const cur = stats.get(v.academy_id) ?? { total: 0, modules: new Set<number>() };
      cur.total += 1;
      cur.modules.add(v.module ?? 1);
      stats.set(v.academy_id, cur);
    }

    return rows.map((a) => {
      const s = stats.get(a.id);
      const totaal_vragen = s?.total ?? a.vragen_per_test;
      const modules = s?.modules.size ?? 1;
      const perModule = Math.max(1, Math.round(totaal_vragen / modules));
      return {
        ...a,
        totaal_vragen,
        modules,
        // Minimum aantal juiste antwoorden per module.
        module_grens: Math.max(1, Math.ceil((perModule * a.slaag_grens) / (totaal_vragen || 1))),
      };
    });
  } catch (err) {
    console.error("SSR data loading warning (academies):", err);
    return [];
  }
});

// ---------- Publiek: één academy + willekeurige vragen (zonder correct antwoord) ----------
export const startExamen = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ slug: z.string(), doelgroep: z.enum(["kids", "16plus"]).default("kids") }).parse(d),
  )
  .handler(async ({ data }) => {
    const sql = db();
    const academy = (
      (await sql`
      select id, diersoort_naam, diersoort_naam_fr, diersoort_naam_en, slug, badge_icon,
             vragen_per_test, slaag_grens, beschrijving, beschrijving_fr, beschrijving_en
        from academies
       where slug = ${data.slug} and is_active = true and status = 'gepubliceerd'
       limit 1
    `) as AcademyRow[]
    )[0];
    if (!academy) throw new Error("Academy niet gevonden");

    type Row = {
      id: string;
      vraag_tekst: string;
      vraag_tekst_fr: string | null;
      vraag_tekst_en: string | null;
      opties: unknown;
      opties_fr: unknown;
      opties_en: unknown;
      module: number | null;
      vraag_type: string | null;
      media_url: string | null;
      media_alt: string | null;
      doelgroep: string | null;
    };
    const vragen = (await sql`
      select id, vraag_tekst, vraag_tekst_fr, vraag_tekst_en, opties, opties_fr, opties_en,
             module, vraag_type, media_url, media_alt, doelgroep
        from academy_vragen
       where academy_id = ${academy.id}
    `) as Row[];

    const shuffle = (arr: Row[]) => {
      const pool = arr.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };

    // Verdeel het examen gelijk over de 3 modules (bv. 12 vragen => 4 per module).
    // Toon enkel vragen van het gekozen spoor (kids of 16+) plus de gedeelde vragen.
    const alle = vragen ?? [];
    const spoor = alle.filter(
      (v) => (v.doelgroep ?? "beide") === data.doelgroep || (v.doelgroep ?? "beide") === "beide",
    );
    // Val terug op alle vragen wanneer het spoor te weinig vragen heeft voor een volledige test.
    const all = spoor.length >= academy.vragen_per_test ? spoor : alle;
    const perModule = Math.max(1, Math.round(academy.vragen_per_test / 3));
    const selected: Row[] = [];
    for (const m of [1, 2, 3]) {
      selected.push(...shuffle(all.filter((v) => (v.module ?? 1) === m)).slice(0, perModule));
    }
    // Vul aan als een module te weinig vragen heeft.
    if (selected.length < academy.vragen_per_test) {
      const chosen = new Set(selected.map((v) => v.id));
      selected.push(
        ...shuffle(all.filter((v) => !chosen.has(v.id))).slice(
          0,
          academy.vragen_per_test - selected.length,
        ),
      );
    }
    // Vraagvolgorde zelf ook willekeurig maken, maar wél gegroepeerd per module
    // zodat de opbouw van het examen (module 1 -> 2 -> 3) behouden blijft.
    selected.sort((a, b) => (a.module ?? 1) - (b.module ?? 1));
    const gemengd: Row[] = [];
    for (const m of [1, 2, 3]) {
      gemengd.push(...shuffle(selected.filter((v) => (v.module ?? 1) === m)));
    }
    gemengd.push(...selected.filter((v) => ![1, 2, 3].includes(v.module ?? 1)));
    selected.length = 0;
    selected.push(...gemengd);

    return {
      academy,
      doelgroep: data.doelgroep,
      vragen: selected.map((v) => ({
        id: v.id,
        vraag_tekst: v.vraag_tekst,
        vraag_tekst_fr: v.vraag_tekst_fr,
        vraag_tekst_en: v.vraag_tekst_en,
        opties: v.opties as string[],
        opties_fr: (v.opties_fr as string[] | null) ?? null,
        opties_en: (v.opties_en as string[] | null) ?? null,
        module: (v.module ?? 1) as number,
        vraag_type: (v.vraag_type ?? "tekst") as "tekst" | "beeld" | "audio",
        media_url: normalizePublicImageUrl(v.media_url),
        media_alt: v.media_alt ?? null,
      })),
    };

  });

// ---------- Publiek: directe feedback op één antwoord ("Wist je dat?") ----------
export const checkAntwoord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ vraag_id: z.string().uuid(), gekozen_index: z.number().int().min(0).max(9) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sql = db();
    const vraag = (
      (await sql`
      select id, correcte_optie_index, wist_je_dat, wist_je_dat_fr, wist_je_dat_en
        from academy_vragen
       where id = ${data.vraag_id}
       limit 1
    `) as Array<{
        correcte_optie_index: number;
        wist_je_dat: string | null;
        wist_je_dat_fr: string | null;
        wist_je_dat_en: string | null;
      }>
    )[0];
    if (!vraag) throw new Error("Vraag niet gevonden");

    return {
      juist: vraag.correcte_optie_index === data.gekozen_index,
      correcte_index: vraag.correcte_optie_index,
      wist_je_dat: vraag.wist_je_dat ?? null,
      wist_je_dat_fr: vraag.wist_je_dat_fr ?? null,
      wist_je_dat_en: vraag.wist_je_dat_en ?? null,
    };
  });

// ---------- Beveiligd: examen inleveren + certificaat uitgeven ----------
export const submitExamen = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        academy_id: z.string().uuid(),
        antwoorden: z.array(
          z.object({ vraag_id: z.string().uuid(), gekozen_index: z.number().int().min(0) }),
        ),
        volledige_naam: z.string().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sql = db();
    const userId = context.userId;

    const academy = (
      (await sql`
      select id, diersoort_naam, slug, slaag_grens, vragen_per_test
        from academies
       where id = ${data.academy_id}
       limit 1
    `) as Array<{
        id: string;
        diersoort_naam: string;
        slug: string;
        slaag_grens: number;
        vragen_per_test: number;
      }>
    )[0];
    if (!academy) throw new Error("Academy bestaat niet");

    // Score altijd server-side hertellen op basis van de opgeslagen vragen.
    const ids = data.antwoorden.map((a) => a.vraag_id);
    const vragen = (await sql`
      select id, correcte_optie_index
        from academy_vragen
       where academy_id = ${academy.id} and id = any(${ids}::uuid[])
    `) as Array<{ id: string; correcte_optie_index: number }>;

    const map = new Map<string, number>();
    for (const v of vragen ?? []) map.set(v.id, v.correcte_optie_index);

    let correct = 0;
    let totaal = 0;
    for (const a of data.antwoorden) {
      if (!map.has(a.vraag_id)) continue;
      totaal++;
      if (map.get(a.vraag_id) === a.gekozen_index) correct++;
    }
    if (totaal === 0) throw new Error("Geen geldige antwoorden");

    const score = `${correct}/${totaal}`;
    const geslaagd = correct >= academy.slaag_grens;

    if (!geslaagd) {
      return {
        geslaagd: false as const,
        score,
        correct,
        totaal,
        slaag_grens: academy.slaag_grens,
      };
    }

    // Certificaat uitgeven: volgnummer per academy, atomair genoeg voor deze schaal.
    const cert = (
      (await sql`
      insert into certificaten (user_id, academy_id, volgnummer, score, volledige_naam)
      values (
        ${userId}::uuid,
        ${academy.id}::uuid,
        (select coalesce(max(volgnummer), 0) + 1 from certificaten where academy_id = ${academy.id}::uuid),
        ${score},
        ${data.volledige_naam.trim()}
      )
      returning id, user_id, academy_id, volgnummer, score, volledige_naam, behaald_op, public_token
    `) as Array<{
        id: string;
        volgnummer: number;
        score: string;
        volledige_naam: string;
        behaald_op: string;
        public_token: string | null;
      }>
    )[0];
    if (!cert) throw new Error("Certificaat kon niet worden aangemaakt");

    // Badge bijschrijven op het profiel (mag nooit het certificaat blokkeren).
    try {
      await sql`
        update profiles
           set behaalde_badges = case
                 when behaalde_badges @> to_jsonb(${academy.slug}::text) then behaalde_badges
                 else coalesce(behaalde_badges, '[]'::jsonb) || to_jsonb(${academy.slug}::text)
               end
         where id = ${userId}::uuid
      `;
    } catch (e) {
      console.error("[academy] badge bijwerken faalde", e);
    }

    // Felicitatiemail (mislukking mag het certificaat nooit blokkeren)
    try {
      const email = (context.claims as { email?: string } | undefined)?.email;
      if (email) {
        const { sendMail, certificateEmail } = await import("./email.server");
        const badge = (
          (await sql`select badge_icon from academies where id = ${academy.id}::uuid limit 1`) as Array<{
            badge_icon: string | null;
          }>
        )[0]?.badge_icon;
        const origin = process.env.SITE_URL || "https://maximilien.brussels";
        const { subject, html } = certificateEmail({
          naam: data.volledige_naam,
          academy: academy.diersoort_naam,
          badge: badge ?? "🏅",
          score,
          onderscheiding: correct === totaal,
          url: `${origin}/account?tab=certificates`,
        });
        await sendMail({ to: email, subject, html, kind: "certificaat" });
      }
    } catch (e) {
      console.error("[email] certificaatmail faalde", e);
    }

    return {
      geslaagd: true as const,
      score,
      correct,
      totaal,
      certificaat: cert,
      academy: {
        id: academy.id,
        slug: academy.slug,
        diersoort_naam: academy.diersoort_naam,
      },
    };
  });

// ---------- Beveiligd: eigen certificaten ----------
export const listMyCertificaten = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const sql = db();
    return (await sql`
      select id, academy_id, volgnummer, score, volledige_naam, behaald_op
        from certificaten
       where user_id = ${context.userId}::uuid
       order by behaald_op desc
    `) as Array<{
      id: string;
      academy_id: string;
      volgnummer: number;
      score: string;
      volledige_naam: string;
      behaald_op: string;
    }>;
  });

// ---------- Beveiligd: één certificaat + academy-info ----------
export const getCertificaat = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sql = db();
    type Cert = {
      id: string;
      user_id: string;
      academy_id: string;
      volgnummer: number;
      score: string;
      volledige_naam: string;
      behaald_op: string;
      public_token: string | null;
    };
    type Aca = {
      id: string;
      diersoort_naam: string;
      diersoort_naam_fr: string | null;
      diersoort_naam_en: string | null;
      slug: string;
      badge_icon: string | null;
    };
    const cert = (
      (await sql`
      select id, user_id, academy_id, volgnummer, score, volledige_naam, behaald_op, public_token
        from certificaten
       where id = ${data.id}::uuid and user_id = ${context.userId}::uuid
       limit 1
    `) as Cert[]
    )[0];
    if (!cert) throw new Error("Niet gevonden");
    const academy =
      ((await sql`
      select id, diersoort_naam, diersoort_naam_fr, diersoort_naam_en, slug, badge_icon
        from academies
       where id = ${cert.academy_id}::uuid
       limit 1
    `) as Aca[])[0] ?? null;
    return { certificaat: cert, academy };
  });

// ---------- Beveiligd: eigen (meest recente) certificaat voor één academie-slug ----------
export const getCertificaatBySlug = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const sql = db();
    const row = (
      (await sql`
      select c.id
        from certificaten c
        join academies a on a.id = c.academy_id
       where a.slug = ${data.slug} and c.user_id = ${context.userId}::uuid
       order by c.behaald_op desc
       limit 1
    `) as Array<{ id: string }>
    )[0];
    return { id: row?.id ?? null };
  });
