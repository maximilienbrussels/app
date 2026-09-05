/**
 * Generatieve UI in de chat: Maxim zet [[route:<vertrekpunt>]] in zijn antwoord
 * en deze component haalt de feitelijke route op en tekent ze op een kaart.
 * Zo verzint de assistent nooit straten, bochten of bruggen.
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { Bike, Footprints, MapPin } from "lucide-react";

import type { RouteMapResult, RouteProfile } from "@/routes/api/route-map";
import { MAPS_URL } from "@/components/chat/MapsLink";
import type { Lang } from "@/lib/i18n";

const RouteMapCanvas = lazy(() => import("@/components/chat/RouteMapCanvas"));

const COPY: Record<Lang, Record<string, string>> = {
  nl: {
    loading: "Route wordt berekend…",
    error: "Ik vond dat vertrekpunt niet terug op de kaart. Kan je je gemeente of straat iets preciezer typen?",
    walk: "Te voet",
    bike: "Met de fiets",
    open: "Open in Google Maps",
    min: "min",
  },
  fr: {
    loading: "Calcul de l'itinéraire…",
    error: "Je n'ai pas retrouvé ce point de départ sur la carte. Pouvez-vous préciser la commune ou la rue ?",
    walk: "À pied",
    bike: "À vélo",
    open: "Ouvrir dans Google Maps",
    min: "min",
  },
  en: {
    loading: "Calculating the route…",
    error: "I couldn't find that starting point on the map. Could you type your town or street a bit more precisely?",
    walk: "Walking",
    bike: "Cycling",
    open: "Open in Google Maps",
    min: "min",
  },
};

/** Haalt [[route:...]] uit een antwoord en geeft de opgekuiste tekst terug. */
export function extractRouteMarker(text: string): { clean: string; start: string } | null {
  const match = text.match(/\[\[route:\s*([^\]]+)\]\]/i);
  if (!match?.[1]) return null;
  return { clean: text.replace(/\[\[route:[^\]]*\]\]/gi, "").trim(), start: match[1].trim() };
}

export function ChatRouteMap({ start, lang }: { start: string; lang: Lang }) {
  const t = COPY[lang] ?? COPY.nl;
  const [profile, setProfile] = useState<RouteProfile>("foot");
  const [data, setData] = useState<RouteMapResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    void (async () => {
      try {
        const res = await fetch("/api/route-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start, profile }),
        });
        if (!res.ok) throw new Error("route");
        const json = (await res.json()) as RouteMapResult;
        if (active) setData(json);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [start, profile]);

  if (error) {
    return (
      <p className="mt-2 rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-200">{t["error"]}</p>
    );
  }

  const minutes = data ? Math.max(1, Math.round(data.durationSeconds / 60)) : null;
  const km = data ? (data.distanceMeters / 1000).toFixed(1) : null;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/15 bg-black/20">
      <div className="flex items-center gap-2 px-3 py-2">
        {(["foot", "bike"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProfile(p)}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition " +
              (profile === p
                ? "bg-white text-slate-900"
                : "bg-white/10 text-slate-200 hover:bg-white/20")
            }
          >
            {p === "foot" ? <Footprints className="size-3.5" /> : <Bike className="size-3.5" />}
            {p === "foot" ? t["walk"] : t["bike"]}
          </button>
        ))}
        {minutes && km ? (
          <span className="ml-auto text-xs text-slate-300">
            {km} km · {minutes} {t["min"]}
          </span>
        ) : null}
      </div>

      {data ? (
        <Suspense
          fallback={<div className="h-64 animate-pulse bg-white/5" aria-label={t["loading"]} />}
        >
          <RouteMapCanvas data={data} />
        </Suspense>
      ) : (
        <div className="h-64 animate-pulse bg-white/5" aria-label={t["loading"]} />
      )}

      <a
        href={MAPS_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-100 hover:underline"
      >
        <MapPin className="size-3.5" /> {t["open"]}
      </a>
    </div>
  );
}
