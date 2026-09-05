/**
 * Isomorfe modusdetectie voor de root-route (beforeLoad).
 * Server: leest hostname + query uit de inkomende request.
 * Browser: leest window.location.
 */
import { createIsomorphicFn } from "@tanstack/react-start";
import { detectAppMode, type AppMode } from "./app-mode";

export const getRequestAppMode = createIsomorphicFn()
  .server(async (): Promise<AppMode> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const url = new URL(req.url);
      const forwarded = req.headers.get("x-forwarded-host");
      const host = (forwarded ?? req.headers.get("host") ?? url.hostname).split(",")[0]?.trim();
      return detectAppMode(host, url.search);
    } catch {
      return detectAppMode(null);
    }
  })
  .client((): AppMode => detectAppMode(window.location.hostname, window.location.search));
