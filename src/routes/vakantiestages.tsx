import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_LANG, pathFor } from "@/lib/routes-i18n";

/** Oude, niet-gelokaliseerde URL: permanent doorverwijzen naar /fr/stages. */
export const Route = createFileRoute("/vakantiestages")({
  beforeLoad: () => {
    throw redirect({ to: pathFor("camps", DEFAULT_LANG), statusCode: 301 });
  },
});
