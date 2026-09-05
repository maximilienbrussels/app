/**
 * Omgevingsgebaseerde app-modus.
 *
 * Prioriteit:
 *  1. `VITE_APP_MODE` ("public" | "admin") — vaste bundel in productie.
 *  2. Hostname: `maximilien.site` (of subdomeinen) → altijd "admin".
 *  3. `?mode=admin` / `?mode=public` in de URL (preview/dev).
 *  4. localStorage-override (dev toggle), anders "public".
 *
 * SSR-veilig: op de server tellen alleen env, hostname en query (uit de request),
 * zodat de server-HTML deterministisch blijft.
 */
import { isPortalPath } from "./portal-routes";

export type AppMode = "public" | "admin";

export const APP_MODE_STORAGE_KEY = "app:mode-override";

/** Hostname van het admin-portaal (wordt ook als suffix herkend: www.maximilien.site). */
export const ADMIN_HOSTNAME = "maximilien.site";

function normalize(value: string | null | undefined): AppMode | null {
  if (value === "public" || value === "admin") return value;
  return null;
}

/** Modus uit de build-time omgeving (undefined in Lovable preview / lokaal). */
export function getEnvAppMode(): AppMode | null {
  return normalize(import.meta.env["VITE_APP_MODE"] as string | undefined);
}

/** True voor maximilien.site en alle subdomeinen ervan. */
export function isAdminHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, "");
  return host === ADMIN_HOSTNAME || host.endsWith(`.${ADMIN_HOSTNAME}`);
}

/**
 * Deterministische detectie op basis van env → hostname → query.
 * Wordt zowel op de server (request-URL) als in de browser gebruikt.
 */
export function detectAppMode(hostname: string | null | undefined, search = ""): AppMode {
  const envMode = getEnvAppMode();
  if (envMode) return envMode;
  if (isAdminHostname(hostname)) return "admin";
  const fromQuery = normalize(new URLSearchParams(search).get("mode"));
  if (fromQuery) return fromQuery;
  return "public";
}

/** Deterministische modus voor SSR zonder request-context en voor de eerste client-render. */
export function getServerAppMode(): AppMode {
  return getEnvAppMode() ?? "public";
}

/** Volledige resolutie, alleen te gebruiken na hydratie. */
export function resolveAppMode(): AppMode {
  const envMode = getEnvAppMode();
  if (envMode) return envMode;
  if (typeof window === "undefined") return "public";

  if (isAdminHostname(window.location.hostname)) return "admin";

  const fromQuery = normalize(new URLSearchParams(window.location.search).get("mode"));
  if (fromQuery) {
    try {
      window.localStorage.setItem(APP_MODE_STORAGE_KEY, fromQuery);
    } catch {
      /* private mode / quota */
    }
    return fromQuery;
  }

  try {
    const stored = normalize(window.localStorage.getItem(APP_MODE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    /* geen storage beschikbaar */
  }

  return "public";
}

/**
 * Paden die in admin-modus mogen renderen. Alles daarbuiten (publieke
 * marketingroutes zoals /nl, /fr, /webshop …) wordt naar /auth gestuurd.
 */
const ADMIN_PATH_PREFIXES = [
  "/auth",
  "/portaal",
  "/vandaag",
  "/aanvragen",
  "/kalender",
  "/diensten",
  "/team",
  "/foutmeldingen",
  "/api",
  // Auth-flows uit transactionele mails moeten óók in admin-modus renderen,
  // anders slaat de herstellink om naar /auth vóór de token gelezen wordt.
  "/wachtwoord-herstellen",
  "/wachtwoord-vergeten",
  "/reset-password",
  "/inloglink",
  "/bevestigen",
];


export function isAdminPath(pathname: string): boolean {
  const path = pathname || "/";
  // Bestanden (sitemap.xml, manifest.json, …) laten we met rust.
  if (/\.[a-z0-9]+$/i.test(path)) return true;
  if (isPortalPath(path)) return true;
  return ADMIN_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Zet de dev-override en herlaadt zodat de juiste bundel geladen wordt. */
export function setAppModeOverride(mode: AppMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  } catch {
    /* negeren */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  // Publieke paden bestaan niet in admin-modus: start dan op de loginpagina.
  if (mode === "admin" && !isAdminPath(url.pathname)) url.pathname = "/auth";
  window.location.replace(url.toString());
}

/** True wanneer de modus niet vastligt in de omgeving of hostname (preview/dev). */
export function isAppModeSwitchable(): boolean {
  if (getEnvAppMode() !== null || !import.meta.env.DEV) return false;
  if (typeof window !== "undefined" && isAdminHostname(window.location.hostname)) return false;
  return true;
}
