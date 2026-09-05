import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mijn-hoefjes")({
  beforeLoad: () => {
    throw redirect({ to: "/$lang/$", params: { lang: "nl", _splat: "pas" }, replace: true });
  },
});
