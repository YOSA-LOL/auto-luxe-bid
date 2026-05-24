import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/list-your-car")({
  head: () => ({
    meta: [
      { title: "List Your Car — APEXAuto" },
      { name: "description", content: "List your premium vehicle on APEXAuto and reach 120,000+ qualified buyers." },
    ],
  }),
  component: ListYourCarPage,
});

function ListYourCarPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    brand: "",
    model: "",
    year: "",
    price: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.brand || !form.model) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitted(true);
    toast.success("Your listing request has been submitted! We'll contact you within 24 hours.");
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full opacity-40"
             style={{ background: "var(--gradient-glow)" }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <Badge variant="outline" className="glass gap-2 px-3 py-1.5 border-primary/30 mb-4">
              <ShieldCheck className="h-3 w-3 text-primary-glow" />
              <span className="text-xs">Verified dealer program</span>
            </Badge>
            <h1 className="font-display text-5xl font-bold leading-tight mb-4">
              Sell smarter with <span className="text-gradient-primary">APEXAuto</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Reach 120,000+ qualified buyers, get instant price discovery, and clear inventory faster.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-16">
            {[
              { icon: ShieldCheck, t: "Verified Buyers", d: "All bidders are KYC-verified with linked payment methods." },
              { icon: Zap, t: "List in 24h", d: "Submit your car today, live on the platform within 24 hours." },
              { icon: TrendingUp, t: "AI Pricing", d: "Get an instant AI-powered valuation based on market data." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl bg-gradient-card border border-border/60 p-6 hover-lift">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold mb-1">{f.t}</h3>
                <p className="text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>

          {submitted ? (
            <div className="max-w-lg mx-auto rounded-3xl glass-strong border border-primary/30 p-10 text-center shadow-elegant">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-primary-glow" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Request Received!</h2>
              <p className="text-muted-foreground mb-6">
                Our team will review your listing and contact you within 24 hours to complete verification.
              </p>
              <Button asChild className="bg-gradient-primary border-0 text-primary-foreground">
                <Link to="/browse">Browse cars while you wait</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto rounded-3xl glass-strong border border-border/60 p-8 shadow-elegant space-y-5">
              <h2 className="font-display text-2xl font-bold mb-2">Submit your listing</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name *</label>
                  <Input value={form.name} onChange={set("name")} placeholder="Ahmed Hassan" className="bg-background/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Email *</label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className="bg-background/40" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
                <Input value={form.phone} onChange={set("phone")} placeholder="+20 10 0000 0000" className="bg-background/40" />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Brand *</label>
                  <Input value={form.brand} onChange={set("brand")} placeholder="McLaren" className="bg-background/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Model *</label>
                  <Input value={form.model} onChange={set("model")} placeholder="GT" className="bg-background/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Year</label>
                  <Input value={form.year} onChange={set("year")} placeholder="2022" className="bg-background/40" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Asking Price (EGP)</label>
                <Input value={form.price} onChange={set("price")} placeholder="5,000,000" className="bg-background/40" />
              </div>

              <Button type="submit" className="w-full h-12 bg-gradient-primary border-0 text-primary-foreground shadow-glow text-base">
                Submit Listing Request
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to our verification process. Our team will contact you within 24 hours.
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
