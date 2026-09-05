import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  fileName: z.string().min(1).max(200),
  fileType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

export const Route = createFileRoute("/api/admin/upload-s3")({
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

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });

        try {
          const { createUploadUrl } = await import("@/lib/s3.server");
          const result = await createUploadUrl({ ...parsed.data, folder: "co-pilot" });
          return Response.json(result);
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Onbekende fout" }, { status: 500 });
        }
      },
    },
  },
});
