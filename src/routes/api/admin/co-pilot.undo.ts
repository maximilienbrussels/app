import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/co-pilot/undo")({
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
          await requirePermission({ supabase: dataApiClient(token), userId: String(claims.sub), claims }, "manage_settings");
        } catch {
          return new Response("Forbidden", { status: 403 });
        }

        const body = (await request.json().catch(() => null)) as { actionId?: string } | null;
        if (!body?.actionId) return Response.json({ error: "actionId required" }, { status: 400 });

        try {
          const { undoCoPilotAction } = await import("@/lib/co-pilot-tools.server");
          const result = await undoCoPilotAction(body.actionId);
          return Response.json(result);
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "Onbekende fout" }, { status: 400 });
        }
      },
    },
  },
});
