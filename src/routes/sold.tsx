import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSoldCarsFromDb, markExpiredAuctions } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Gavel,
  TrendingUp,
  MapPin,
  Gauge,
  Users,
  Trophy,
  ArrowRight,
  BarChart3,
} from "lucide-react";

import { useLanguage } from "@/lib/language";
import { brandPageTitle } from "@/lib/brand";

export const Route = createFileRoute("/sold")({
  head: () => ({ meta: [{ title: brandPageTitle("Sold Listings") }] }),
  loader: async () => {
    await markExpiredAuctions();
    const cars = await getSoldCarsFromDb();
    return { cars: cars.map(dbCarToApp) };
  },
  component: SoldPage,
});

function SoldPage() {
  const { cars } = Route.useLoaderData();
  const { t } = useLanguage();

  const totalValue = cars.reduce((sum, c) => sum + (c.currentBid ?? c.price), 0);
  const avgPrice = cars.length > 0 ? Math.round(totalValue / cars.length) : 0;
  const highestSale = cars.length > 0
    ? Math.max(...cars.map((c) => c.currentBid ?? c.price))
    : 0;

  const stats = [
    { label: t("sold_stat_total"), value: cars.length.toString(), icon: Gavel, color: "text-primary-glow" },
    { label: t("sold_stat_value"), value: formatPrice(totalValue), icon: BarChart3, color: "text-success" },
    { label: t("sold_stat_avg"), value: cars.length > 0 ? formatPrice(avgPrice) : "—", icon: TrendingUp, color: "text-primary" },
    { label: t("sold_stat_record"), value: cars.length > 0 ? formatPrice(highestSale) : "—", icon: Trophy, color: "text-warning" },
  ];

  return (
    <div className="min-h-screen pb-nav">
      <Header />

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 opacity-30 hero-accent-orb pointer-events-none" />
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 sm:py-12 relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]/15">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
            </span>
            <span className="text-label-caps text-[var(--success)]">
              {t("sold_badge")}
            </span>
          </div>
          <h1 className="page-title mb-2">{t("sold_title")}</h1>
          <p className="text-muted-foreground page-subtitle max-w-lg">{t("sold_p")}</p>
        </div>
      </div>

      <div className="page-content max-w-7xl">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="glass-strong rounded-2xl p-5 border border-border/40 flex flex-col gap-3"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 ${s.color}`}>
                <s.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </div>
              <div>
                <div className="font-display text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Empty state ── */}
        {cars.length === 0 ? (
          <div className="text-center py-32 glass-strong rounded-3xl border border-border/40">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/60 mx-auto mb-4">
              <Gavel className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">{t("sold_empty_title")}</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">{t("sold_empty_p")}</p>
            <Button asChild className="bg-gradient-primary border-0 text-primary-foreground">
              <Link to="/auctions">{t("calendar_view_live")}</Link>
            </Button>
          </div>
        ) : (
          /* ── Cards grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cars.map((car) => {
              const finalPrice = car.currentBid ?? car.price;
              const gain = car.price > 0
                ? Math.round(((finalPrice - car.price) / car.price) * 100)
                : 0;

              return (
                <Link
                  key={car.id}
                  to="/cars/$carId"
                  params={{ carId: car.id }}
                  className="group flex flex-col glass-strong rounded-2xl border border-border/40 hover:border-primary/30 hover-lift transition-smooth overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {car.image ? (
                      <img
                        src={car.image}
                        alt={car.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary/40 flex items-center justify-center">
                        <Gavel className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* SOLD badge */}
                    <div className="absolute top-3 start-3">
                      <Badge className="bg-[var(--success)] text-white border-0 gap-1 text-[10px] font-bold px-2 py-1 shadow-lg">
                        <CheckCircle2 className="h-3 w-3" />
                        SOLD
                      </Badge>
                    </div>

                    {/* Bids badge */}
                    {car.bids != null && car.bids > 0 && (
                      <div className="absolute top-3 end-3">
                        <Badge
                          variant="outline"
                          className="bg-black/50 border-white/20 text-white gap-1 text-[10px]"
                        >
                          <Users className="h-3 w-3" />
                          {car.bids} bids
                        </Badge>
                      </div>
                    )}

                    {/* Final price — pinned to bottom of image */}
                    <div className="absolute bottom-3 start-3 end-3 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">
                          Final Price
                        </div>
                        <div className="font-display text-2xl font-bold text-white leading-none">
                          {formatPrice(finalPrice)}
                        </div>
                      </div>
                      {gain !== 0 && (
                        <div
                          className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            gain > 0
                              ? "bg-[var(--success)]/25 text-[var(--success)]"
                              : "bg-red-500/25 text-red-300"
                          }`}
                        >
                          {gain > 0 ? "+" : ""}
                          {gain}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                        {car.brand} · {car.year}
                      </div>
                      <h3 className="font-display text-base font-bold leading-snug line-clamp-1">
                        {car.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {car.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {car.city}
                        </span>
                      )}
                      {car.mileage != null && (
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3 shrink-0" />
                          {formatNumber(car.mileage)} km
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Starting:{" "}
                        <span className="text-foreground/70">{formatPrice(car.price)}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-glow group-hover:translate-x-0.5 transition-smooth" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
