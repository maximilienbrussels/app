import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/auth/providers
 *
 * Publieke, secret-vrije statuslijst van de sociale inlogmethodes. De
 * inlogpagina toont enkel knoppen voor providers die effectief geconfigureerd
 * zijn, zodat bezoekers nooit op een foutmelding botsen. De callback-URL's zijn
 * publieke informatie (ze staan ook in de developer console van de provider) en
 * helpen beheerders bij het instellen.
 */
export const Route = createFileRoute("/api/auth/providers")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { siteOrigin } = await import("@/lib/google-oauth.server");
        const { hasDatabase } = await import("@/lib/neon.server");
        const origin = siteOrigin(request);

        const env = (name: string) => Boolean(process.env[name]);
        const db = hasDatabase();

        const providers = [
          {
            id: "google" as const,
            configured: db && env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"),
            missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"].filter((n) => !env(n)),
            startPath: "/api/auth/google",
            callbackUrl: `${origin}/api/auth/callback/google`,
          },
          {
            id: "github" as const,
            configured: db && env("GITHUB_CLIENT_ID") && env("GITHUB_CLIENT_SECRET"),
            missing: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"].filter((n) => !env(n)),
            startPath: "/api/auth/github",
            callbackUrl: `${origin}/api/auth/callback/github`,
          },
          {
            // Mastodon registreert zijn app dynamisch: enkel een database nodig.
            id: "mastodon" as const,
            configured: db,
            missing: db ? [] : ["DATABASE_URL"],
            startPath: "/api/auth/mastodon",
            callbackUrl: `${origin}/api/auth/callback/mastodon`,
          },
        ];

        return new Response(
          JSON.stringify({ origin, database: db, providers }),
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
