import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/partners")({
  beforeLoad: () => {
    throw redirect({
      to: "/$lang/$",
      params: { lang: "nl", _splat: "partners" },
      replace: true,
    });
  },
});
