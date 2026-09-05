/**
 * Browserzijde van de Google-koppeling (`/api/google/*`).
 */
import { apiFetch } from "./client";

export type GoogleStatusResponse = {
  configured: boolean;
  linked: boolean;
  hasRefreshToken: boolean;
  scope: string | null;
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  redirectUris: string[];
};

export type GoogleSyncResponse = { ok: boolean; count: number; message: string };

export function getGoogleStatus() {
  return apiFetch<GoogleStatusResponse>("/api/google/status");
}

export function runGoogleSync() {
  return apiFetch<GoogleSyncResponse>("/api/google/sync", { method: "POST" });
}

/** Start (of hernieuwt) de Google-koppeling met offline toegang. */
export function connectGoogle(next?: string): void {
  const url = new URL("/api/auth/google", window.location.origin);
  if (next) url.searchParams.set("next", next);
  window.location.href = url.toString();
}
