import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCarsFromDb, getLiveCarsFromDb } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatPrice } from "@/lib/mock-data";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Users, Gavel, ArrowRight, Flame } from "lucide-react";

export const Route = createFileRoute("/auctions")({
  head: () => ({
    meta: [
      { title: "Live Auctions — APEXAuto" },
      { name: "description", content: "Join live used car auctions in real time." },
    ],
  }),
  loader: async () => {
    const [liveCars, allCars] = await Promise.all([getLiveCarsFromDb(), getCarsFromDb()]);
    return {
      live: liveCars.map(dbCarToApp).sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0)),
      upcoming: allCars.filter((c) => !c.is_live).slice(0, 3).map(dbCarToApp),
    };
  },
  component: AuctionsPage,
});

function AuctionsPage() {
  const { live, upcoming } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--live)] font-semibold">{live.length} Live Now</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold">Live <span className="text-gradient-primary">Auctions</span></h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Pay the entry fee, place real-time bids, and win premium vehicles backed by buyer protection.</p>

        {live.length === 0 ? (
          <div className="mt-16 text-center py-20 glass-strong rounded-3xl border border-border/40">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No live auctions right now</h3>
            <p className="text-muted-foreground">Check back soon or browse all listings.</p>
            <Button asChild className="mt-6 bg-gradient-primary border-0 text-primary-foreground">
              <Link to="/browse" search={{ q: "" }}>Browse Cars</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {live.map((c) => (
              <Link
                key={c.id}
                to="/cars/$carId"
                params={{ carId: c.id }}
                className="group relative grid md:grid-cols-[260px_1fr_auto] gap-5 items-center glass-strong rounded-2xl p-4 hover-lift"
              >
                <div className="relative aspect-[16/11] rounded-xl overflow-hidden">
                  <img src={c.image} alt={c.title} loading="lazy" width={1280} height={896} className="h-full w-full object-cover" />
                  <Badge className="absolute top-2 left-2 bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
                    <Radio className="h-3 w-3" /> LIVE
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{c.brand} · {c.year}</div>
                  <h3 className="font-display text-xl font-bold">{c.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {c.viewers} watching</span>
                    <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-400" /> {c.bids} bids</span>
                    <span className="inline-flex items-center gap-1.5">{c.dealership}</span>
                  </div>
                  {c.endsAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Ends in</span>
                      <CountdownTimer endsAt={c.endsAt} className="font-display font-semibold text-[var(--live)]" />
                    </div>
                  )}
                </div>

                <div className="text-right space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Bid</div>
                    <div className="font-display text-2xl font-bold text-gradient-primary">{formatPrice(c.currentBid ?? c.price)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Min +{formatPrice(c.minRaise)}</div>
                  </div>
                  <Button className="bg-gradient-primary border-0 text-primary-foreground shadow-glow w-full sm:w-auto">
                    <Gavel className="h-4 w-4" /> Bid Now
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Coming up</span>
                <h2 className="font-display text-2xl font-bold mt-1">Available for Purchase</h2>
              </div>
              <Button asChild variant="ghost">
                <Link to="/browse" search={{ q: "" }}>View all <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {upcoming.map((c) => (
                <Link
                  key={c.id}
                  to="/cars/$carId"
                  params={{ carId: c.id }}
                  className="glass rounded-2xl p-4 hover-lift flex gap-4 items-center"
                >
                  <img src={c.image} alt={c.title} className="h-16 w-20 object-cover rounded-xl shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">{c.brand} · {c.year}</div>
                    <div className="font-display font-semibold text-sm">{c.title}</div>
                    <div className="font-display text-sm font-bold text-gradient-primary mt-1">{formatPrice(c.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
