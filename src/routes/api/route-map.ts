/**
 * Feitelijke route-API voor de chat: geocodeert het vertrekpunt van de bezoeker
 * (Nominatim) en haalt het échte wandel-/fietspad naar Werfkaai 2 op
 * (OpenRouteService, met OSRM als sleutelloze terugval).
 *
 * De AI verzint dus nooit straatnamen of bruggen — de kaart toont de waarheid.
 */
import { createFileRoute } from "@tanstack/react-router";

export const runtime = "nodejs";

/** Werfkaai 2 / Quai du Batelage 2, 1000 Brussel. */
export const FARM_COORD = { lat: 50.8621, lon: 4.3487 };
const FARM_LABEL = "Werfkaai 2, 1000 Brussel";

const UA = "FermeMaximilienChat/1.0 (info@lafermeduparcmaximilien.be)";

export type RouteProfile = "foot" | "bike";

export type RouteMapResult = {
  start: { lat: number; lon: number; label: string };
  end: { lat: number; lon: number; label: string };
  profile: RouteProfile;
  /** [lat, lon] paren, klaar voor Leaflet. */
  path: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
};

async function geocode(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=be&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const first = json[0];
  if (!first) return null;
  return { lat: Number(first.lat), lon: Number(first.lon), label: first.display_name };
}

type Directions = { path: [number, number][]; distanceMeters: number; durationSeconds: number };

async function fetchOrs(
  from: { lat: number; lon: number },
  profile: RouteProfile,
  key: string,
): Promise<Directions | null> {
  const orsProfile = profile === "bike" ? "cycling-regular" : "foot-walking";
  const res = await fetch(`https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`, {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: [
        [from.lon, from.lat],
        [FARM_COORD.lon, FARM_COORD.lat],
      ],
    }),
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: [number, number][] };
      properties?: { summary?: { distance?: number; duration?: number } };
    }[];
  };
  const feature = json.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!coords?.length) return null;
  return {
    path: coords.map(([lon, lat]) => [lat, lon] as [number, number]),
    distanceMeters: feature?.properties?.summary?.distance ?? 0,
    durationSeconds: feature?.properties?.summary?.duration ?? 0,
  };
}

/** Sleutelloze terugval zodat de kaart ook zonder ORS-sleutel klopt. */
async function fetchOsrm(
  from: { lat: number; lon: number },
  profile: RouteProfile,
): Promise<Directions | null> {
  const osrmProfile = profile === "bike" ? "bike" : "foot";
  const url = `https://routing.openstreetmap.de/routed-${osrmProfile}/route/v1/driving/${from.lon},${from.lat};${FARM_COORD.lon},${FARM_COORD.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[];
  };
  const route = json.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!coords?.length) return null;
  return {
    path: coords.map(([lon, lat]) => [lat, lon] as [number, number]),
    distanceMeters: route?.distance ?? 0,
    durationSeconds: route?.duration ?? 0,
  };
}

export const Route = createFileRoute("/api/route-map")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          start?: unknown;
          profile?: unknown;
        };
        const start = typeof body.start === "string" ? body.start.trim().slice(0, 160) : "";
        const profile: RouteProfile = body.profile === "bike" ? "bike" : "foot";
        if (start.length < 2) {
          return Response.json({ error: "start required" }, { status: 400 });
        }

        let origin: { lat: number; lon: number; label: string } | null = null;
        const coordMatch = start.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (coordMatch) {
          origin = {
            lat: Number(coordMatch[1]),
            lon: Number(coordMatch[2]),
            label: "Jouw locatie",
          };
        } else {
          try {
            origin =
              (await geocode(start)) ??
              (await geocode(/brussel|bruxelles|brussels/i.test(start) ? start : `${start}, België`));
          } catch {
            origin = null;
          }
        }
        if (!origin) {
          return Response.json({ error: "geocode_failed" }, { status: 404 });
        }

        const key = process.env["OPENROUTESERVICE_API_KEY"] ?? process.env["ORS_API_KEY"];
        let directions: Directions | null = null;
        try {
          if (key) directions = await fetchOrs(origin, profile, key);
        } catch {
          directions = null;
        }
        if (!directions) {
          try {
            directions = await fetchOsrm(origin, profile);
          } catch {
            directions = null;
          }
        }
        if (!directions) {
          return Response.json({ error: "route_failed" }, { status: 502 });
        }

        const result: RouteMapResult = {
          start: origin,
          end: { ...FARM_COORD, label: FARM_LABEL },
          profile,
          ...directions,
        };
        return Response.json(result, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
