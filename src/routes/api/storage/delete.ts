/**
 * POST/DELETE /api/storage/delete
 * Verwijdert een object uit de Scaleway-bucket (fileKey of volledige publicUrl).
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteObject, fileKeyFromUrl, s3Config } from "@/lib/s3.server";

const bodySchema = z
  .object({
    fileKey: z.string().min(1).max(300).optional(),
    publicUrl: z.string().url().max(600).optional(),
  })
  .refine((v) => Boolean(v.fileKey || v.publicUrl), {
    message: "fileKey of publicUrl is vereist",
  });

async function handler({ request }: { request: Request }) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const { verifyAuthToken } = await import("@/lib/neon-data.server");
  try {
    await verifyAuthToken(header.slice(7).trim());
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });

  try {
    const cfg = s3Config();
    const key = parsed.data.fileKey ?? fileKeyFromUrl(cfg, parsed.data.publicUrl!);
    if (!key) {
      return Response.json(
        { error: "Deze URL hoort niet bij de mediabucket." },
        { status: 400 },
      );
    }
    await deleteObject(key);
    return Response.json({ success: true, message: "File deleted successfully" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    console.error(`S3 delete failed: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/storage/delete")({
  server: { handlers: { POST: handler, DELETE: handler } },
});
