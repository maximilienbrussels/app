/**
 * DELETE /api/media/scaleway/delete — verwijdert bestanden definitief.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({ keys: z.array(z.string().min(1).max(512)).min(1).max(100) });

export const Route = createFileRoute("/api/media/scaleway/delete")({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        const { requireRouteAuth } = await import("@/lib/route-auth.server");
        const guard = await requireRouteAuth(request);
        if ("response" in guard) return guard.response;

        const parsed = schema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) {
          return Response.json({ error: "Ongeldige aanvraag.", code: "bad_request" }, { status: 400 });
        }
        try {
          const { deleteMediaObjects } = await import("@/lib/scaleway-media.server");
          const deleted = await deleteMediaObjects(parsed.data.keys);
          return Response.json({ ok: true, deleted });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Onbekende fout";
          console.error("[scaleway] verwijderen mislukt:", message);
          return Response.json({ error: message, code: "storage_error" }, { status: 502 });
        }
      },
    },
  },
});
