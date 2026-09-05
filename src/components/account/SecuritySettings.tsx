/**
 * Beveiliging: gekoppelde accounts (Google, GitHub, Mastodon) en passkeys.
 */
import { ConnectedAccounts } from "@/components/settings/ConnectedAccounts";
import { PasskeySettings } from "@/components/settings/PasskeySettings";

export function SecuritySettings() {
  return (
    <div className="space-y-3">
      <ConnectedAccounts />
      <PasskeySettings />
    </div>
  );
}
