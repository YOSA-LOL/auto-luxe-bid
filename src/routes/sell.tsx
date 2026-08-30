import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createListingRequest } from "@/lib/cars.server";
import { toast } from "sonner";
import { Car, CheckCircle2, ArrowRight, DollarSign, Shield, Clock } from "lucide-react";
import { Route as RootRoute } from "@/routes/__root";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [{ title: "Sell Your Car — APEXAuto" }] }),
  component: SellPage,
});

function SellPage() {
  const { user: ssrUser } = RootRoute.useRouteContext();
  const { user: clerkUser, isLoaded } = useUser();
  const user = isLoaded && clerkUser
    ? {
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "",
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      }
    : ssrUser;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    brand: "",
    model: "",
    year: "",
    price: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.brand || !form.model) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await createListingRequest({ data: form });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-nav md:pb-0">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="flex items-center gap-2 mb-3">
            <Car className="h-4 w-4 text-primary-glow" />
            <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">List Your Car</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold mb-3">
            Sell Through <span className="text-gradient-primary">APEXAuto</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
            Submit your car details and our team will review your listing request. We'll contact you within 24 hours.
          </p>

          {/* Why sell here */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: DollarSign, title: "Best Price", desc: "Competitive auction pricing" },
              { icon: Shield, title: "Verified", desc: "Full inspection process" },
              { icon: Clock, title: "Fast", desc: "Listed within 48 hours" },
            ].map((item) => (
              <div key={item.title} className="glass rounded-xl p-3 text-center border border-border/40">
                <item.icon className="h-5 w-5 text-primary-glow mx-auto mb-1.5" />
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-16">
        {submitted ? (
          /* Success state */
          <div className="text-center py-16 glass-strong rounded-3xl border border-[var(--success)]/30">
            <CheckCircle2 className="h-16 w-16 text-[var(--success)] mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Our team will review your listing and contact you at <strong>{form.email}</strong> within 24 hours.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button asChild className="bg-gradient-primary border-0 text-primary-foreground gap-2">
                <Link to="/browse" search={{ q: "" }}>Browse Cars <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" className="glass" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", brand: "", model: "", year: "", price: "", notes: "" }); }}>
                Submit Another
              </Button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="glass-strong rounded-3xl border border-border/60 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Your Information</h2>
              <p className="text-xs text-muted-foreground">We'll use this to contact you about your listing</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ahmed Mohamed" className="bg-background/50" required />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Email Address <span className="text-destructive">*</span></label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ahmed@example.com" className="bg-background/50" required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1.5">Phone Number</label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01012345678" className="bg-background/50" />
              </div>
            </div>

            <div className="border-t border-border/40 pt-6">
              <h2 className="font-display text-xl font-bold mb-1">Car Details</h2>
              <p className="text-xs text-muted-foreground">Tell us about the car you'd like to sell</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Brand <span className="text-destructive">*</span></label>
                <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="BMW, Mercedes, Toyota…" className="bg-background/50" required />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Model <span className="text-destructive">*</span></label>
                <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="M3, C63, Camry…" className="bg-background/50" required />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Year</label>
                <Input value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2021" className="bg-background/50" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Your Asking Price (EGP)</label>
                <Input value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1,500,000" className="bg-background/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1.5">Additional Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Condition, mileage, modifications, service history, reason for selling…"
                  rows={4}
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-primary border-0 text-primary-foreground text-base font-semibold gap-2"
            >
              {loading ? "Submitting…" : <>Submit Listing Request <ArrowRight className="h-5 w-5" /></>}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By submitting, you agree to our review process. Our team will reach out within 24 hours.
            </p>
          </form>
        )}
      </div>

      <Footer />
    </div>
  );
}
