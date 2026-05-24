import { createFileRoute, redirect } from "@tanstack/react-router";
import { handleGoogleCallback } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) throw redirect({ to: "/login" });
    await handleGoogleCallback({ data: { code, state } });
  },
  component: CallbackPage,
});

function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
