import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCarsFromDb, markExpiredAuctions } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatPrice } from "@/lib/mock-data";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Radio, Clock, ArrowRight, Gavel } from "lucide-react";
import type { AppCar } from "@/lib/types";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Auction Calendar — APEXAuto" }] }),
  loader: async () => {
    await markExpiredAuctions();
    const all = await getCarsFromDb();
    const cars = all.map(dbCarToApp);
    const live = cars.filter((c) => c.isLive && c.endsAt).sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0));
    const upcoming = cars.filter((c) => !c.isLive && !c.isSold).sort((a, b) => (b.year - a.year));
    return { live, upcoming };
  },
  component: CalendarPage,
});

function groupByDate(cars: AppCar[]): Record<string, AppCar[]> {
  const groups: Record<string, AppCar[]> = {};
  for (const car of cars) {
    const date = car.endsAt
      ? new Date(car.endsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "No End Date";
    if (!groups[date]) groups[date] = [];
    groups[date].push(car);
  }
  return groups;
}

function CalendarPage() {
  const { live, upcoming } = Route.useLoaderData();
  const grouped = groupByDate(live);

  return (
    <div className="min-h-screen pb-nav md:pb-0">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary-glow" />
            <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Schedule</span>
          </div>
          <h1 className="font-display text-4xl font-bold">
            Auction <span className="text-gradient-primary">Calendar</span>
          </h1>
          <p className="text-muted-foreground mt-2">Track live and upcoming auction end times.</p>
        </div>

        {live.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
              <h2 className="font-display text-xl font-bold">{live.length} Live Now</h2>
            </div>
            {Object.entries(grouped).map(([date, cars]) => (
              <div key={date} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{date}</span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                <div className="space-y-3">
                  {cars.map((car) => (
                    <Link
                      key={car.id}
                      to="/cars/$carId"
                      params={{ carId: car.id }}
                      className="group flex items-center gap-4 glass-strong rounded-2xl p-4 hover-lift border border-primary/20"
                    >
                      <div className="relative h-16 w-24 rounded-xl overflow-hidden shrink-0">
                        {car.image ? (
                          <img src={car.image} alt={car.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-secondary/40" />
                        )}
                        <Badge className="absolute top-1 start-1 bg-[var(--live)] text-white border-0 gap-0.5 text-[9px] px-1 py-0">
                          <Radio className="h-2 w-2" /> LIVE
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">{car.brand} · {car.year}</div>
                        <div className="font-display font-semibold truncate">{car.title}</div>
                        <div className="font-display text-sm font-bold text-gradient-primary mt-0.5">
                          {formatPrice(car.currentBid ?? car.price)}
                        </div>
                      </div>

                      {car.endsAt && (
                        <div className="text-end shrink-0">
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mb-0.5">
                            <Clock className="h-3 w-3" /> Ends in
                          </div>
                          <CountdownTimer endsAt={car.endsAt} className="font-display font-bold text-[var(--live)]" />
                        </div>
                      )}

                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold">Upcoming ({upcoming.length})</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-16 glass-strong rounded-3xl border border-border/40">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming auctions scheduled.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((car) => (
                <Link
                  key={car.id}
                  to="/cars/$carId"
                  params={{ carId: car.id }}
                  className="group glass rounded-2xl p-4 hover-lift border border-border/40 hover:border-primary/30 transition-smooth"
                >
                  <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3">
                    {car.image ? (
                      <img src={car.image} alt={car.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-secondary/40 flex items-center justify-center">
                        <Gavel className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{car.brand} · {car.year}</div>
                  <div className="font-display font-semibold mt-0.5 truncate">{car.title}</div>
                  <div className="font-display text-sm font-bold text-gradient-primary mt-1">{formatPrice(car.price)}</div>
                  <Badge variant="outline" className="mt-2 text-[10px] glass border-border/40">Upcoming Auction</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="glass">
            <Link to="/auctions">View Live Auctions <ArrowRight className="h-4 w-4 ms-2" /></Link>
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
