/**
 * Beheerderskaart: zet in één klik de uploadrechten (CORS) op de Europese
 * Scaleway-bucket, zodat beelden rechtstreeks vanuit de browser geüpload
 * kunnen worden.
 */
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { neonSupabaseCompat as supabase } from "@/lib/neon-auth-compat";

export function S3CorsSection() {
  const [busy, setBusy] = useState(false);
  const [origins, setOrigins] = useState<string[] | null>(null);

  async function init() {
    setBusy(true);
    try {
      const { data } = await supabase.auth
        .getSession()
        .catch(() => ({ data: { session: null } }) as never);
      const token = data?.session?.access_token;
      const res = await fetch("/api/admin/init-s3-cors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; bucket?: string; origins?: string[]; error?: string }
        | null;
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `Mislukt (${res.status})`);
      }
      setOrigins(body.origins ?? []);
      toast.success(`Uploadrechten ingesteld op ${body.bucket}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Instellen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Opslagrechten
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Nodig zodat foto's rechtstreeks vanuit de browser naar de Europese opslag kunnen. Eén keer
        instellen is genoeg; opnieuw uitvoeren kan geen kwaad.
      </p>
      <Button type="button" onClick={() => void init()} disabled={busy} className="mt-4 rounded-full">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Initialiseer Scaleway S3 Rechten
      </Button>
      {origins && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {origins.map((o) => (
            <li key={o}>✓ {o}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
