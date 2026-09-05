import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/account")({
  beforeLoad: () => {
    throw redirect({
      to: "/$lang/$",
      params: { lang: "nl", _splat: "mijn-account" },
      search: true,
      replace: true,
    });
  },
});
