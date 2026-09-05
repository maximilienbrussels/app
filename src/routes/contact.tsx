import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  beforeLoad: () => {
    throw redirect({
      to: "/$lang/$",
      params: { lang: "nl", _splat: "contact" },
      search: true,
      replace: true,
    });
  },
});
