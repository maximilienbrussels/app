/**
 * Gedeelde bearer-controle voor API-routes (`/api/...`).
 * Routes zijn rechtstreeks oproepbaar, dus elke route die privégegevens leest
 * of schrijft controleert hier zelf de sessie.
 */

export type RouteAuth = { userId: string; email: string | null };

export async function requireRouteAuth(
  request: Request,
): Promise<{ auth: RouteAuth } | { response: Response }> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { response: Response.json({ error: "Niet aangemeld." }, { status: 401 }) };
  }
  try {
    const { verifyAuthToken } = await import("@/lib/neon-data.server");
    const claims = (await verifyAuthToken(header.slice(7).trim())) as {
      sub?: string;
      userId?: string;
      email?: string | null;
    };
    const userId = claims.sub ?? claims.userId ?? "";
    return { auth: { userId, email: claims.email ?? null } };
  } catch {
    return { response: Response.json({ error: "Je sessie is verlopen." }, { status: 401 }) };
  }
}
