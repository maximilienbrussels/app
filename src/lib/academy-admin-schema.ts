import { z } from "zod";
import { ACADEMY_CATEGORIES } from "./academy-filter";

export const ACADEMY_STATUSES = ["concept", "wacht_op_goedkeuring", "gepubliceerd"] as const;
export type AcademyStatus = (typeof ACADEMY_STATUSES)[number];

/**
 * Vertaalsleutels per status (drietalig via t() in de UI, zie
 * portal-i18n/academy.ts — sleutels "academy.status.<status>").
 */
export const STATUS_LABEL_KEYS: Record<AcademyStatus, string> = {
  concept: "academy.status.concept",
  wacht_op_goedkeuring: "academy.status.wachtOpGoedkeuring",
  gepubliceerd: "academy.status.live",
};

const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

export const academyInputSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug: text(60).regex(/^[a-z0-9-]+$/, "Enkel kleine letters, cijfers en streepjes"),
  diersoort_naam: text(80),
  diersoort_naam_fr: optional(80),
  diersoort_naam_en: optional(80),
  beschrijving: optional(600),
  beschrijving_fr: optional(600),
  beschrijving_en: optional(600),
  categorie: z.enum(ACADEMY_CATEGORIES),
  badge_icon: text(8),
  cover_image_url: optional(500),
  cover_image_alt: optional(200),
  vragen_per_test: z.number().int().min(1).max(60),
  slaag_grens: z.number().int().min(1).max(60),
  prioriteit: z.number().int().min(0).max(999),
  is_active: z.boolean(),
});

export type AcademyInput = z.infer<typeof academyInputSchema>;

export const vraagInputSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  academy_id: z.string().uuid(),
  module: z.number().int().min(1).max(3),
  doelgroep: z.enum(["kids", "16plus", "beide"]).default("beide"),
  vraag_type: z.enum(["tekst", "beeld", "audio"]),
  vraag_tekst: text(400),
  vraag_tekst_fr: optional(400),
  vraag_tekst_en: optional(400),
  opties: z.array(text(200)).min(2).max(6),
  opties_fr: z.array(z.string().trim().max(200)).max(6).optional().nullable(),
  opties_en: z.array(z.string().trim().max(200)).max(6).optional().nullable(),
  correcte_optie_index: z.number().int().min(0).max(5),
  media_url: optional(400),
  media_alt: optional(200),
  wist_je_dat: optional(600),
  wist_je_dat_fr: optional(600),
  wist_je_dat_en: optional(600),
});

export type VraagInput = z.infer<typeof vraagInputSchema>;

export const publishRequestSchema = z.object({
  academy_id: z.string().uuid(),
  note: optional(500),
});

export const publishDecisionSchema = z.object({
  request_id: z.string().uuid(),
  approve: z.boolean(),
  decision_note: optional(500),
});
