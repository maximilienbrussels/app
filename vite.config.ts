// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// Vercel zet VERCEL=1 tijdens build én runtime; VERCEL_ENV is de fallback.
const isVercel = Boolean(process.env["VERCEL"] || process.env["VERCEL_ENV"]);

/**
 * `@neondatabase/auth` genereert op moduleniveau een tab-id met
 * `crypto.randomUUID()`. In de Cloudflare Worker-runtime is willekeur in global
 * scope verboden ("Disallowed operation called within global scope"), waardoor
 * de SSR soms een 500 gaf. We maken die waarde server-side statisch; in de
 * browser blijft het gedrag identiek.
 */
const neonAuthGlobalScopeFix = {
  name: "neon-auth-global-scope-fix",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.includes("@neondatabase")) return null;
    if (!code.includes("CURRENT_TAB_CLIENT_ID = crypto.randomUUID()")) return null;
    return {
      code: code.replace(
        "CURRENT_TAB_CLIENT_ID = crypto.randomUUID()",
        'CURRENT_TAB_CLIENT_ID = typeof window === "undefined" ? "server-tab" : crypto.randomUUID()',
      ),
      map: null,
    };
  },
};

export default defineConfig({
  vite: {
    plugins: [neonAuthGlobalScopeFix],

    // Eigen domeinen mogen de dev-server aanspreken (lokale hosts-mapping om
    // de domeinscheiding admin/publiek te testen).
    server: { allowedHosts: ["maximilien.site", "maximilien.brussels"] },

    // Serverless functies hebben geen node_modules-resolutie op runtime: alles
    // moet in de bundel zitten, anders faalt de deploy met o.a.
    // "Cannot find module 'tslib/modules/index.js'". Enkel tijdens de
    // Vercel-build: in dev moeten dependencies extern blijven.
    ...(isVercel ? { ssr: { noExternal: true } } : {}),
    resolve: {
      alias: [
        {
          // `@` expliciet naar ./src (naast de tsconfig-paths resolutie), zodat
          // de build niet afhankelijk is van de current working directory.
          find: /^@\//,
          replacement: `${path.resolve(projectRoot, "src")}/`,
        },
        {
          // tslib publiceert CommonJS als default entry; in een volledig
          // gebundelde serverfunctie levert die interop `undefined` op
          // ("Cannot destructure property '__extends'"). De ESM-build wél.
          find: /^tslib$/,
          replacement: path.resolve(projectRoot, "node_modules/tslib/tslib.es6.mjs"),
        },
        {
          // `cloudflare:sockets` bestaat enkel in de Cloudflare Worker-runtime.
          // `@neondatabase/serverless` importeert het voor zijn (ongebruikte)
          // WebSocket-pad. Zonder stub crasht de serverbundel op Node/Vercel
          // bij het laden — dus elke request een 500.
          find: /^cloudflare:sockets$/,
          replacement: path.resolve(projectRoot, "src/lib/cloudflare-sockets-stub.ts"),
        },
      ],
    },
  },

  nitro: {
    // Op Vercel expliciet de vercel-preset; elders laat de wrapper zijn eigen
    // default staan (Lovable-preview/Cloudflare) zodat beide targets blijven werken.
    ...(isVercel ? { preset: "vercel" as const } : {}),
  },

  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Idem voor de client: eigen src/client.tsx i.p.v. de default in
    // node_modules (die soms niet door de preview-proxy raakte -> wit scherm).
    client: { entry: "client" },
  },
});
