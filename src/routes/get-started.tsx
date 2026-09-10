import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — Get Started now lives at `/`. */
export const Route = createFileRoute("/get-started")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
