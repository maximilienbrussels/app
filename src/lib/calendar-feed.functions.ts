/**
 * Persoonlijke iCal-feed van een medewerker: token ophalen, filters bewaren en
 * het token vernieuwen wanneer de link per ongeluk gedeeld werd.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-middleware";
import { requirePermission } from "@/lib/portal-permissions";
import { safeError } from "@/lib/safe-error";

export type FeedSettings = {
  token: string;
  includeAssigned: boolean;
  includeSchools: boolean;
  includeAll: boolean;
};

async function sql() {
  const { db } = await import("./neon.server");
  return db();
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

type Row = {
  token: string;
  include_assigned: boolean;
  include_schools: boolean;
  include_all: boolean;
};

const shape = (r: Row): FeedSettings => ({
  token: r.token,
  includeAssigned: r.include_assigned,
  includeSchools: r.include_schools,
  includeAll: r.include_all,
});

/** Huidige feedinstellingen ophalen; maakt bij de eerste keer een token aan. */
export const getMyCalendarFeed = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<FeedSettings> => {
    try {
      await requirePermission(context, "view_calendar");
      const db = await sql();
      const profileId = (context as { userId?: string }).userId;
      if (!profileId) throw new Error("Geen profiel gevonden.");
      const rows = (await db`
        insert into calendar_feed_tokens (profile_id, token)
        values (${profileId}::uuid, ${newToken()})
        on conflict (profile_id) do update set updated_at = now()
        returning token, include_assigned, include_schools, include_all
      `) as Row[];
      if (!rows[0]) throw new Error("De agenda-feed kon niet aangemaakt worden.");
      return shape(rows[0]);
    } catch (error) {
      throw safeError(error, "De agenda-feed kon niet geladen worden.");
    }
  });

/** Filters van de persoonlijke feed bewaren. */
export const saveCalendarFeedFilters = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        includeAssigned: z.boolean(),
        includeSchools: z.boolean(),
        includeAll: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<FeedSettings> => {
    try {
      await requirePermission(context, "view_calendar");
      const db = await sql();
      const profileId = (context as { userId?: string }).userId;
      if (!profileId) throw new Error("Geen profiel gevonden.");
      const rows = (await db`
        update calendar_feed_tokens set
          include_assigned = ${data.includeAssigned},
          include_schools = ${data.includeSchools},
          include_all = ${data.includeAll},
          updated_at = now()
        where profile_id = ${profileId}::uuid
        returning token, include_assigned, include_schools, include_all
      `) as Row[];
      if (!rows[0]) throw new Error("Nog geen feed aangemaakt.");
      return shape(rows[0]);
    } catch (error) {
      throw safeError(error, "De feedinstellingen konden niet bewaard worden.");
    }
  });

/** Token vernieuwen: de oude link werkt daarna niet meer. */
export const rotateCalendarFeedToken = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<FeedSettings> => {
    try {
      await requirePermission(context, "view_calendar");
      const db = await sql();
      const profileId = (context as { userId?: string }).userId;
      if (!profileId) throw new Error("Geen profiel gevonden.");
      const rows = (await db`
        insert into calendar_feed_tokens (profile_id, token)
        values (${profileId}::uuid, ${newToken()})
        on conflict (profile_id) do update set token = excluded.token, updated_at = now()
        returning token, include_assigned, include_schools, include_all
      `) as Row[];
      if (!rows[0]) throw new Error("De agenda-feed kon niet aangemaakt worden.");
      return shape(rows[0]);
    } catch (error) {
      throw safeError(error, "Het token kon niet vernieuwd worden.");
    }
  });
