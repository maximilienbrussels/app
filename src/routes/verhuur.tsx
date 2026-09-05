import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_LANG, pathFor } from "@/lib/routes-i18n";

/** Oude, niet-gelokaliseerde URL: permanent doorverwijzen naar /fr/location. */
export const Route = createFileRoute("/verhuur")({
  beforeLoad: () => {
    throw redirect({ to: pathFor("rental", DEFAULT_LANG), statusCode: 301 });
  },
});
