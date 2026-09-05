import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { isSuperAdminEmail } from "@/lib/superadmin";

export type PortalAccess = {
  allowed: boolean;
  email: string | null;
  role: "admin" | "team" | null;
};

/**
 * Toegangscontrole voor het beheerportaal.
 *
 * De bron van waarheid is de Neon-tabel `portal_admins` (kolommen: email,
 * role, active). Beheerders kunnen daar rechtstreeks in Neon worden
 * toegevoegd/verwijderd; de app leest live uit die tabel.
 */
export const checkPortalAccess = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<PortalAccess> => {
    const claims = context.claims as { email?: string } | null;
    const email = (claims?.email ?? "").trim().toLowerCase();
    if (!email) return { allowed: false, email: null, role: null };

    // Super-admin: altijd toegang; ontbrekende rijen worden aangevuld.
    if (isSuperAdminEmail(email)) {
      const { ensureSuperAdmin } = await import("@/lib/superadmin.server");
      await ensureSuperAdmin(email, context.userId ?? null);
      return { allowed: true, email, role: "admin" };
    }

    const { db } = await import("@/lib/neon.server");
    const rows = (await db()`
      select role, active from portal_admins where lower(email) = ${email} limit 1
    `) as Array<{ role: string; active: boolean }>;

    const row = rows[0];
    if (!row || !row.active) return { allowed: false, email, role: null };
    return {
      allowed: true,
      email,
      role: row.role === "team" ? "team" : "admin",
    };
  });
