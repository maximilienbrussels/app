/**
 * POST /api/admin/init-s3-cors
 *
 * Zet in één klik de CORS-regels op de Scaleway-bucket zodat de browser
 * rechtstreeks kan uploaden met een pre-signed URL. Enkel voor beheerders met
 * het recht `manage_settings`.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/init-s3-cors")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get("authorization");
        if (!header?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = header.slice(7).trim();

        const { verifyAuthToken, dataApiClient } = await import("@/lib/neon-data.server");
        const { requirePermission } = await import("@/lib/portal-permissions");
        let claims: { sub: string; email?: string };
        try {
          claims = (await verifyAuthToken(token)) as never;
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          await requirePermission(
            { supabase: dataApiClient(token), userId: String(claims.sub), claims },
            "manage_settings",
          );
        } catch {
          return new Response("Forbidden", { status: 403 });
        }

        try {
          const { applyBucketCors } = await import("@/lib/s3.server");
          const result = await applyBucketCors();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Onbekende fout";
          console.error("[init-s3-cors]", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
