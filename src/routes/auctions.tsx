import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CARS, liveAuctions, formatPrice } from "@/lib/mock-data";
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
  component: AuctionsPage,
});

function AuctionsPage() {
  const live = liveAuctions().sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0));
  const upcoming = CARS.filter((c) => !c.isLive).slice(0, 3);

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
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{c.brand} · {c.year} · {c.city}</div>
                <h3 className="font-display text-2xl font-bold">{c.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.viewers} watching</span>
                  <span className="inline-flex items-center gap-1"><Gavel className="h-3.5 w-3.5" /> {c.bids} bids</span>
                  <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-[var(--live)]" /> +{formatPrice(c.minRaise!)} min raise</span>
                </div>
              </div>

              <div className="text-right space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Bid</div>
                  <div className="font-display text-2xl font-bold text-gradient-primary">{formatPrice(c.currentBid!)}</div>
                </div>
                <div className="glass rounded-lg px-4 py-2 inline-block">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ends in</div>
                  <CountdownTimer endsAt={c.endsAt!} className="text-lg" />
                </div>
                <Button size="sm" className="w-full bg-gradient-primary border-0 text-primary-foreground">
                  Join auction <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="font-display text-2xl font-bold mt-16 mb-5">Upcoming</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {upcoming.map((c) => (
            <Link key={c.id} to="/cars/$carId" params={{ carId: c.id }} className="glass-strong rounded-2xl p-4 hover-lift block">
              <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3">
                <img src={c.image} alt={c.title} loading="lazy" width={1280} height={800} className="h-full w-full object-cover" />
              </div>
              <Badge variant="outline" className="mb-2">Starts soon</Badge>
              <h3 className="font-display font-semibold">{c.title}</h3>
              <p className="text-sm text-muted-foreground">Reserve {formatPrice(c.price)}</p>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
