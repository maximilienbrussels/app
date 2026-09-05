import { useState } from "react";
import { toast } from "sonner";
import googleAsset from "@/assets/google-wallet.png";
import { handleImageError } from "@/lib/image-fallback";

export type Locale = "nl" | "fr" | "en";

const COPY: Record<
  Locale,
  { label: string; loading: string; apple: string; failed: string; notConfigured: string }
> = {
  nl: {
    label: "Toevoegen aan Google Wallet",
    loading: "Pas wordt aangemaakt…",
    apple: "Op iPhone? Bewaar deze pagina in Safari of toon de QR-code aan de kassa — Apple Wallet volgt binnenkort.",
    failed: "Kon de pas niet aanmaken. Probeer het later opnieuw.",
    notConfigured: "Google Wallet is nog niet geconfigureerd op deze site.",
  },
  fr: {
    label: "Ajouter à Google Wallet",
    loading: "Création du pass…",
    apple: "Sur iPhone ? Enregistrez cette page dans Safari ou montrez le QR à la caisse — Apple Wallet arrive bientôt.",
    failed: "Impossible de créer le pass. Réessayez plus tard.",
    notConfigured: "Google Wallet n'est pas encore configuré sur ce site.",
  },
  en: {
    label: "Add to Google Wallet",
    loading: "Creating pass…",
    apple: "On iPhone? Save this page in Safari or show the QR at the desk — Apple Wallet is coming soon.",
    failed: "Could not create the pass. Please try again later.",
    notConfigured: "Google Wallet is not configured on this site yet.",
  },
};

export type GoogleWalletMemberButtonProps = {
  memberId: string;
  memberName: string;
  hooiBalance: number;
  tier?: string;
  locale?: Locale;
  className?: string;
};

/** Officiële "Toevoegen aan Google Wallet"-knop voor de Mijn Hooi ledenpas. */
export function GoogleWalletButton({
  memberId,
  memberName,
  hooiBalance,
  tier,
  locale = "nl",
  className = "",
}: GoogleWalletMemberButtonProps) {
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const c = COPY[locale];

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/google/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, memberName, hooiBalance, tier, locale }),
      });
      const data = (await res.json()) as { saveUrl?: string; error?: string };

      if (!res.ok || !data.saveUrl) {
        if (data.error === "wallet_not_configured") {
          setNotConfigured(true);
          toast.info(c.notConfigured);
        } else {
          toast.error(c.failed);
        }
        return;
      }
      window.open(data.saveUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(c.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={c.label}
        className="inline-block rounded-full transition-transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-terracotta)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <img
          src={googleAsset}
          onError={handleImageError}
          alt={c.label}
          className="h-12 w-auto rounded-full"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </button>
      <p className="max-w-md text-xs text-muted-foreground">{loading ? c.loading : c.apple}</p>
      {notConfigured && import.meta.env.DEV ? (
        <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] text-amber-900">
          💡 Google Wallet secrets niet geconfigureerd in Vercel
        </p>
      ) : null}
    </div>
  );
}

export default GoogleWalletButton;
