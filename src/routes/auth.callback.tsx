import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
