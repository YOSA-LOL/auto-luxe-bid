import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { getCarsFromDb, getLiveCarsFromDb } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatNumber } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gavel, ShieldCheck, Sparkles, Zap, Radio, TrendingUp, Search } from "lucide-react";
import heroCar from "@/assets/hero-car.jpg";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [allCars, liveCars] = await Promise.all([getCarsFromDb(), getLiveCarsFromDb()]);
    return { cars: allCars.map(dbCarToApp), liveCars: liveCars.map(dbCarToApp) };
  },
  component: Index,
});

function Index() {
  const { cars, liveCars } = Route.useLoaderData();
  const featured = cars.slice(0, 6);
  const [searchQ, setSearchQ] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: searchQ } });
  };

  const firstLive = liveCars[0];

  return (
    <div className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full"
             style={{ background: "var(--gradient-glow)" }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-7 animate-fade-up">
              <Badge variant="outline" className="glass gap-2 px-3 py-1.5 border-primary/30">
                <Sparkles className="h-3 w-3 text-primary-glow" />
                <span className="text-xs">{liveCars.length} live auction{liveCars.length !== 1 ? "s" : ""} running now</span>
              </Badge>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                Where premium <br />
                <span className="text-gradient-primary">used cars</span> <br />
                find their owner.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Browse verified inventory from trusted dealerships, join live auctions in real time, and win the car you actually want — with full protection.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground border-0 shadow-glow hover:opacity-90 h-12 px-6">
                  <Link to="/auctions">
                    <Gavel className="h-4 w-4" />
                    Enter Live Auction
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="glass h-12 px-6">
                  <Link to="/browse" search={{ q: "" }}>
                    Browse Cars <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 max-w-md">
                {[
                  { v: `${cars.length}+`, l: "Cars Listed" },
                  { v: `${liveCars.length}`, l: "Live Now" },
                  { v: "98%", l: "Verified" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-display text-2xl font-bold text-gradient-primary">{s.v}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-up">
              <div className="absolute -inset-8 bg-gradient-glow opacity-60 blur-3xl" />
              <div className="relative rounded-3xl overflow-hidden border border-border/60 shadow-elegant animate-float">
                <img src={heroCar} alt="Featured car" width={1920} height={1280} className="w-full h-auto" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent" />
                {firstLive && (
                  <>
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
                        <Radio className="h-3 w-3" /> LIVE NOW
                      </Badge>
                      <div className="glass-strong rounded-lg px-3 py-2 text-right">
                        <div className="text-[10px] text-muted-foreground uppercase">Viewers</div>
                        <div className="font-display font-bold tabular-nums">{firstLive.viewers}</div>
                      </div>
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 glass-strong rounded-xl p-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs text-muted-foreground">{firstLive.brand} · {firstLive.year}</div>
                          <div className="font-display text-xl font-bold">EGP {formatNumber(firstLive.currentBid ?? firstLive.price)}</div>
                        </div>
                        <Button asChild size="sm" className="bg-gradient-primary border-0 text-primary-foreground">
                          <Link to="/cars/$carId" params={{ carId: firstLive.id }}>Bid Now</Link>
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING SEARCH */}
      <section className="relative -mt-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl glass-strong rounded-2xl p-3 shadow-elegant">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-background/40 rounded-xl">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Try 'McLaren', 'Toyota', 'Cairo'…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="bg-gradient-primary border-0 text-primary-foreground h-12 px-8">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* LIVE STRIP */}
      {liveCars.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--live)] font-semibold">Live Now</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">Bidding in progress</h2>
            </div>
            <Button asChild variant="ghost">
              <Link to="/auctions">View all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveCars.slice(0, 3).map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        </section>
      )}

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: ShieldCheck, t: "Verified Dealers", d: "Every dealership is KYC-verified. Every car has a condition report." },
            { icon: Zap, t: "Real-Time Bidding", d: "Sub-100ms updates. See every bid, every raise, the moment it happens." },
            { icon: TrendingUp, t: "AI Price Insight", d: "Know fair market value before you bid. Predictive pricing on every listing." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl bg-gradient-card border border-border/60 p-7 hover-lift">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Curated</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2">Featured inventory</h2>
          </div>
          <Button asChild variant="ghost"><Link to="/browse" search={{ q: "" }}>All cars <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-card border border-border/60 p-10 lg:p-16">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-50" style={{ background: "var(--gradient-glow)" }} />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
              Run a dealership? <span className="text-gradient-primary">Sell smarter.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Reach {formatNumber(120000)}+ qualified buyers, get instant price discovery, and clear inventory faster than ever.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild size="lg" className="bg-gradient-primary border-0 text-primary-foreground shadow-glow">
                <Link to="/list-your-car">Become a dealer</Link>
              </Button>
              <Button size="lg" variant="outline" className="glass" onClick={() => toast.info("Our sales team: sales@apexauto.com · +20 2 1234 5678")}>
                Talk to sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
