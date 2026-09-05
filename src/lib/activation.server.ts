/**
 * Server-only helpers voor accountactivatie op uitnodiging.
 *
 * Toegang tot het beheerportaal is strikt whitelist-only: enkel adressen die
 * in `portal_admins` staan (of de vaste super-admin) kunnen een account
 * activeren of een wachtwoord instellen. Er is bewust géén publieke
 * registratie.
 */
import { isSuperAdminEmail } from "./superadmin";

/** Staat dit adres op de whitelist (`portal_admins`) of is het de super-admin? */
export async function isWhitelistedEmail(email: string): Promise<boolean> {
  const mail = email.trim().toLowerCase();
  if (!mail) return false;
  if (isSuperAdminEmail(mail)) return true;
  const { db } = await import("./neon.server");
  try {
    const rows = (await db()`
      select 1 as found from portal_admins where lower(email) = ${mail} limit 1
    `) as Array<{ found: number }>;
    return rows.length > 0;
  } catch (error) {
    console.error("[activatie] whitelistcheck mislukt:", error);
    return false;
  }
}
