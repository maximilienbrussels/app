import type { DataClient } from "@/lib/db-types";
import { isSuperAdminEmail } from "@/lib/superadmin";

type PermissionContext = {
  supabase: DataClient;
  userId: string;
  claims?: { email?: string } | null;
};

/** Rollen met altijd alle rechten. */
const FULL_ACCESS = ["owner", "super_admin"];

/** Werpt een fout wanneer de ingelogde medewerker het recht niet heeft. */
export async function requirePermission(context: PermissionContext, permission: string) {
  // Vaste eigenaars hebben altijd alle rechten.
  if (isSuperAdminEmail(context.claims?.email)) return;

  // Rechtstreeks in Postgres kijken: dit werkt ook wanneer de Data API-laag
  // (RLS) geen rijen teruggeeft voor deze gebruiker.
  try {
    const { db } = await import("@/lib/neon.server");
    const sql = db();
    const rows = (await sql`
      select ur.role::text as role from user_roles ur where ur.user_id = ${context.userId}::uuid
    `) as Array<{ role: string }>;
    const roles = rows.map((r) => r.role);
    if (roles.some((r) => FULL_ACCESS.includes(r))) return;
    if (roles.length > 0) {
      const allowed = (await sql`
        select 1 from role_permissions
        where allowed and permission = ${permission} and role::text = any(${roles})
        limit 1
      `) as unknown[];
      if (allowed.length > 0) return;
    }
    throw new Error("Je hebt geen rechten voor deze actie.");
  } catch (error) {
    if (error instanceof Error && error.message === "Je hebt geen rechten voor deze actie.") {
      throw error;
    }
    // Val terug op de databasefunctie via de Data API.
    const { data, error: rpcError } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permission: permission,
    });
    if (rpcError) throw new Error(rpcError.message);
    if (!data) throw new Error("Je hebt geen rechten voor deze actie.");
  }
}
