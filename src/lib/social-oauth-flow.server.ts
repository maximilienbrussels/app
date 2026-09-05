/**
 * Gedeelde OAuth-flow (server-only): state-cookie zetten bij het starten en
 * bij de callback de gebruiker bijwerken, de sessie-JWT ondertekenen en
 * doorsturen naar `/account` of het beheerdersportaal.
 */
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  cookieHeader,
  landingPathForRole,
  readCookie,
  resolveRole,
  siteOrigin,
} from "./google-oauth.server";
import { logAuthConfig, loginErrorUrl } from "./auth-config";
import { upsertSocialUser, type SocialProfile, type SocialProvider } from "./social-oauth.server";

export function buildState(request: Request): string {
  const requested = new URL(request.url).searchParams.get("next");
  const next = requested && requested.startsWith("/") ? requested : "";
  const nonce = crypto.randomUUID().replace(/-/g, "");
  return next ? `${nonce}.${btoa(next)}` : nonce;
}

export function startRedirect(request: Request, authUrl: URL, state: string): Response {
  const origin = siteOrigin(request);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Set-Cookie": cookieHeader(OAUTH_STATE_COOKIE, state, {
        maxAge: 600,
        secure: origin.startsWith("https://"),
      }),
      "Cache-Control": "no-store",
    },
  });
}

export function oauthFailure(
  request: Request,
  reason: string,
  provider?: SocialProvider,
  error?: unknown,
): Response {
  const origin = siteOrigin(request);
  console.error("[OAuth Failure]", {
    provider: provider ?? "onbekend",
    reason,
    origin,
    url: new URL(request.url).pathname,
    message: error instanceof Error ? error.message : error ? String(error) : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
  logAuthConfig(origin, provider === "github" ? "github" : undefined);
  return new Response(null, {
    status: 302,
    headers: {
      Location: loginErrorUrl(origin, request, reason, provider),
      "Cache-Control": "no-store",
    },
  });
}

/** Valideert de state en levert de code terug, of een foutredirect. */
export function verifyCallback(
  request: Request,
  provider: SocialProvider,
): { code: string; next: string } | Response {
  const params = new URL(request.url).searchParams;
  if (params.get("error")) return oauthFailure(request, `${provider}-geweigerd`, provider);
  const code = params.get("code");
  const state = params.get("state");
  const stateCookie = readCookie(request, OAUTH_STATE_COOKIE);
  if (!code) return oauthFailure(request, `${provider}-zonder-code`, provider);
  if (!state || !stateCookie || state !== stateCookie) {
    return oauthFailure(request, `${provider}-state`, provider);
  }
  let next = "";
  const encoded = state.split(".")[1];
  if (encoded) {
    try {
      const decoded = atob(encoded);
      if (decoded.startsWith("/")) next = decoded;
    } catch {
      /* ongeldige state-payload: negeren */
    }
  }
  return { code, next };
}

/** Werkt de gebruiker bij, zet de sessiecookie en stuurt door. */
export async function completeSocialLogin(
  request: Request,
  provider: SocialProvider,
  profile: SocialProfile,
  next: string,
): Promise<Response> {
  const origin = siteOrigin(request);
  const { user, role } = await upsertSocialUser(profile, provider);
  const effectiveRole = await resolveRole(user.email, role);

  const auth = await import("./local-auth.server");
  const sessionToken = await auth.signSession(user);
  const handoff = await auth.mintToken({
    kind: "magic",
    email: user.email,
    ttlSeconds: 300,
    userId: user.id,
  });

  const landing = next || landingPathForRole(effectiveRole);
  const destination = handoff
    ? new URL(
        `/inloglink?token=${encodeURIComponent(handoff)}&next=${encodeURIComponent(landing)}`,
        origin,
      )
    : new URL(landing, origin);

  const secure = origin.startsWith("https://");
  const headers = new Headers({ Location: destination.toString(), "Cache-Control": "no-store" });
  headers.append(
    "Set-Cookie",
    cookieHeader(SESSION_COOKIE, sessionToken, { maxAge: 30 * 24 * 3600, secure }),
  );
  headers.append("Set-Cookie", cookieHeader(OAUTH_STATE_COOKIE, "", { maxAge: 0, secure }));
  return new Response(null, { status: 302, headers });
}
