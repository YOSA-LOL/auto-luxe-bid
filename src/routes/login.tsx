import { createFileRoute, redirect } from "@tanstack/react-router";
import { getGoogleAuthUrl, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Gavel } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign In — APEXAuto" }],
  }),
  beforeLoad: async () => {
    const user = await getUser();
    if (user) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (e) {
      setError("Failed to start Google sign-in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full opacity-30"
           style={{ background: "var(--gradient-glow)" }} />

      <div className="relative w-full max-w-md">
        <div className="glass-strong rounded-3xl border border-border/60 p-10 shadow-elegant text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Gavel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold">
              APEX<span className="text-gradient-primary">Auto</span>
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to access live auctions, place bids, and manage your listings.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-medium text-sm gap-3 rounded-xl"
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            By signing in, you agree to our{" "}
            <button onClick={() => toast.info("Terms of Service available at: apexauto.com/terms")} className="underline underline-offset-2 hover:text-foreground transition-smooth">Terms of Service</button>
            {" "}and{" "}
            <button onClick={() => toast.info("Privacy Policy available at: apexauto.com/privacy")} className="underline underline-offset-2 hover:text-foreground transition-smooth">Privacy Policy</button>.
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          APEXAuto — Premium Used Car Auctions
        </p>
      </div>
    </div>
  );
}
