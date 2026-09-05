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

import { useLanguage } from "@/lib/language";
import { brandPageTitle } from "@/lib/brand";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: brandPageTitle("Auction Calendar") }] }),
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

function groupByDate(cars: AppCar[], isAr: boolean): Record<string, AppCar[]> {
  const groups: Record<string, AppCar[]> = {};
  const locale = isAr ? "ar-EG" : "en-GB";
  for (const car of cars) {
    const date = car.endsAt
      ? new Date(car.endsAt).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : isAr ? "بدون تاريخ انتهاء" : "No End Date";
    if (!groups[date]) groups[date] = [];
    groups[date].push(car);
  }
  return groups;
}

function CalendarPage() {
  const { live, upcoming } = Route.useLoaderData();
  const { t, isAr } = useLanguage();
  const grouped = groupByDate(live, isAr);

  return (
    <div className="min-h-screen pb-nav">
      <Header />
      <div className="page-content max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary-glow" />
            <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">{t("calendar_badge")}</span>
          </div>
          <h1 className="page-title">{t("calendar_title")}</h1>
          <p className="text-muted-foreground mt-2 page-subtitle">{t("calendar_p")}</p>
        </div>

        {live.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
              <h2 className="font-display text-xl font-bold">{t("calendar_live_count", { n: live.length })}</h2>
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
                      className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 glass-strong rounded-2xl p-3 sm:p-4 hover-lift border border-primary/20"
                    >
                      <div className="relative h-16 w-24 rounded-xl overflow-hidden shrink-0">
                        {car.image ? (
                          <img src={car.image} alt={car.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-secondary/40" />
                        )}
                        <Badge className="absolute top-1 start-1 bg-[var(--live)] text-white border-0 gap-0.5 text-[9px] px-1 py-0">
                          <Radio className="h-2 w-2" /> {t("badge_live")}
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
                        <div className="text-start sm:text-end shrink-0">
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mb-0.5">
                            <Clock className="h-3 w-3" /> {t("auctions_ends_in")}
                          </div>
                          <CountdownTimer endsAt={car.endsAt} className="font-display font-bold text-[var(--live)]" />
                        </div>
                      )}

                      <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth shrink-0" />
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
            <h2 className="font-display text-xl font-bold">{t("calendar_upcoming", { n: upcoming.length })}</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-16 glass-strong rounded-3xl border border-border/40">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("calendar_none")}</p>
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
                  <Badge variant="outline" className="mt-2 text-[10px] glass border-border/40">{t("badge_upcoming")}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="glass">
            <Link to="/auctions">{t("calendar_view_live")} <ArrowRight className="h-4 w-4 ms-2" /></Link>
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
