import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang/$", params: { lang: "nl", _splat: "privacy" }, replace: true });
  },
});
