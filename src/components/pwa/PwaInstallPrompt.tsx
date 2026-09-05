import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useT, type Lang } from "@/lib/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const COPY: Record<
  Lang,
  { title: string; body: string; install: string; later: string; ios: string; dismiss: string }
> = {
  nl: {
    title: "Installeer de Maximiliaan App",
    body: "Installeer de Maximiliaan App voor snelle toegang tot de boerderij, openingsuren en de Maxim AI-chat.",
    install: "Installeer App",
    later: "Laten wezen",
    ios: "Tik op het Delen-icoon 📤 en kies 'Zet op beginverscherm'.",
    dismiss: "Melding sluiten",
  },
  fr: {
    title: "Installez l'app Maximilien",
    body: "Installez l'app Maximilien pour un accès rapide à la ferme, aux heures d'ouverture et au chat Maxim AI.",
    install: "Installer l'app",
    later: "Plus tard",
    ios: "Touchez l'icône Partager 📤 puis « Sur l'écran d'accueil ».",
    dismiss: "Fermer la notification",
  },
  en: {
    title: "Install the Maximilien App",
    body: "Install the Maximilien App for quick access to the farm, opening hours and the Maxim AI chat.",
    install: "Install App",
    later: "Not now",
    ios: "Tap the Share icon 📤 and choose 'Add to Home Screen'.",
    dismiss: "Dismiss notification",
  },
};

const KEY = "maxim.install.dismissed";

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Subtiele banner om de webapp te installeren (PWA), met iOS-instructie. */
export function PwaInstallPrompt() {
  const { lang } = useT();
  const c = COPY[lang];
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS/Safari kent geen beforeinstallprompt: na korte vertraging de tip tonen.
    const timer = setTimeout(() => {
      if (isIos()) {
        setIosHint(true);
        setVisible(true);
      }
    }, 4000);

    const onInstalled = () => {
      localStorage.setItem(KEY, "installed");
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  function close() {
    localStorage.setItem(KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") localStorage.setItem(KEY, "installed");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:left-6 sm:w-[380px]">
      <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-apricot)]/50 bg-card/95 p-3 shadow-[0_25px_60px_-25px_rgba(74,103,65,0.5)] backdrop-blur-lg dark:border-border">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--color-terracotta)] text-white">
          <Download className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{c.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{c.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {iosHint ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--surface-page)] px-3 py-1 text-xs font-semibold">
                <Share className="size-3.5" /> {c.install}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void install()}
                className="rounded-full bg-[color:var(--color-terracotta)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                {c.install}
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              {c.later}
            </button>
          </div>
          {iosHint ? <p className="mt-2 text-[11px] text-muted-foreground">{c.ios}</p> : null}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={c.dismiss}
          className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
