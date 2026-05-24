import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUser, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gavel, Mail, User } from "lucide-react";
import { useState } from "react";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: { name?: string; email?: string } = {};
    if (!name || name.trim().length < 2) e.name = "Enter your name (at least 2 characters)";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn({ data: { name: name.trim(), email: email.trim().toLowerCase() } });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "isRedirect" in err) throw err;
      setErrors({ email: "Something went wrong. Please try again." });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full opacity-30"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div className="relative w-full max-w-md">
        <div className="glass-strong rounded-3xl border border-border/60 p-10 shadow-elegant">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Gavel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold">
              APEX<span className="text-gradient-primary">Auto</span>
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold mb-1 text-center">Welcome</h1>
          <p className="text-muted-foreground text-sm mb-8 text-center">
            Enter your details to access live auctions and place bids.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Ahmed Hassan"
                  className={`pl-9 bg-background/40 h-11 ${errors.name ? "border-destructive" : ""}`}
                  autoComplete="name"
                />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="you@gmail.com"
                  className={`pl-9 bg-background/40 h-11 ${errors.email ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-primary border-0 text-primary-foreground shadow-glow text-base mt-2"
            >
              {loading ? (
                <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Sign In / Sign Up"
              )}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground text-center leading-relaxed">
            No password needed. Just enter your name and email to get started.
          </p>
        </div>

        <p className="text-center mt-4 text-xs text-muted-foreground">
          APEXAuto — Premium Used Car Auctions
        </p>
      </div>
    </div>
  );
}
