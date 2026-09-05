import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/social")({
  beforeLoad: () => {
    throw redirect({
      to: "/$lang/$",
      params: { lang: "nl", _splat: "social" },
      replace: true,
    });
  },
});
