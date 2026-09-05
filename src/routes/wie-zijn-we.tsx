import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/wie-zijn-we")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang/$", params: { lang: "nl", _splat: "over-ons" }, replace: true });
  },
});
