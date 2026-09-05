import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/webshop/")({
  beforeLoad: () => {
    throw redirect({
      to: "/$lang/$",
      params: { lang: "nl", _splat: "hoevewinkel" },
      replace: true,
    });
  },
});
