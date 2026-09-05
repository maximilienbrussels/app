import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/steun")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang/$", params: { lang: "nl", _splat: "steun-ons" }, replace: true });
  },
});
