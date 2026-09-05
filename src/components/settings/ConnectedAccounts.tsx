/**
 * Gekoppelde accounts (Google, GitHub, Mastodon).
 *
 * De status komt live uit de actieve sessie: is de aanbieder gekoppeld, dan
 * tonen we "🟢 Gekoppeld" met het e-mailadres en wordt "Koppelen" vervangen
 * door "Ontkoppelen".
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleIcon, GitHubIcon, MastodonIcon } from "@/components/auth/ProviderIcons";
import { MastodonInstanceDialog } from "@/components/auth/MastodonInstanceDialog";
import { useAuthIdentities } from "@/hooks/useAuthIdentities";
import { startOAuth } from "@/lib/oauth-status";
import { unlinkMyIdentity, type IdentityProviderId } from "@/lib/identities.functions";

const PROVIDERS: {
  id: IdentityProviderId;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
}[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
  { id: "mastodon", label: "Mastodon", Icon: MastodonIcon },
];

const LOCKOUT_MESSAGE =
  "Je kunt deze inlogmethode niet ontkoppelen omdat je anders niet meer kunt inloggen. Stel eerst een wachtwoord in of koppel een ander account.";

export function ConnectedAccounts() {
  const [mastodonOpen, setMastodonOpen] = useState(false);
  const { isLoading, email, isLinked, canUnlink, refreshIdentities } = useAuthIdentities();

  const unlink = useMutation({
    mutationFn: (provider: IdentityProviderId) => unlinkMyIdentity({ data: { provider } }),
    onSuccess: () => {
      toast.success("Inlogmethode ontkoppeld.");
      void refreshIdentities();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Ontkoppelen is mislukt."),
  });

  function link(provider: IdentityProviderId) {
    if (provider === "mastodon") {
      setMastodonOpen(true);
      return;
    }
    startOAuth(provider, "/account");
  }

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Inlogmethodes laden…</p>;
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map(({ id, label, Icon }) => {
        const linked = isLinked(id);
        const blocked = linked && !canUnlink(id);
        const busy = unlink.isPending && unlink.variables === id;
        return (
          <div
            key={id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {label}
                  {linked && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      🟢 Actief
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {linked
                    ? `🟢 Gekoppeld${email ? ` (${email})` : ""}`
                    : "⚪ Niet gekoppeld"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={linked ? "outline" : "secondary"}
              disabled={unlink.isPending}
              className="min-h-[44px] shrink-0 rounded-full px-4 text-xs"
              onClick={() => {
                if (!linked) return link(id);
                if (blocked) {
                  toast.error(LOCKOUT_MESSAGE);
                  return;
                }
                unlink.mutate(id);
              }}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {linked ? "Ontkoppelen" : "Koppelen"}
            </Button>
          </div>
        );
      })}

      <MastodonInstanceDialog
        open={mastodonOpen}
        onOpenChange={setMastodonOpen}
        onConfirm={(instance) => startOAuth("mastodon", "/account", instance)}
      />
    </div>
  );
}
