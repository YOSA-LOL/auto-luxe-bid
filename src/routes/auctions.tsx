import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCarsFromDb, getLiveCarsFromDb, markExpiredAuctions } from "@/lib/cars.server";
import { dbCarToApp, type AppCar } from "@/lib/types";
import { formatPrice } from "@/lib/mock-data";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, Users, Gavel, ArrowRight, Flame, CheckCircle2, Calendar, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { PageMeta } from "@/components/PageMeta";

export const Route = createFileRoute("/auctions")({
  loader: async () => {
    await markExpiredAuctions();
    const [liveCars, allCars] = await Promise.all([getLiveCarsFromDb(), getCarsFromDb()]);
    return {
      live: liveCars.map(dbCarToApp).sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0)),
      upcoming: allCars.filter((c) => !c.is_live && !c.is_sold).slice(0, 3).map(dbCarToApp),
    };
  },
  component: AuctionsPage,
});

function AuctionRow({ c, now }: { c: AppCar; now: number }) {
  const { t } = useLanguage();
  const isExpired = c.endsAt != null && now > 0 && c.endsAt < now;
  return (
    <Link
      to="/cars/$carId"
      params={{ carId: c.id }}
      className="group relative grid md:grid-cols-[260px_1fr_auto] gap-5 items-center glass-strong rounded-2xl p-4 hover-lift"
    >
      <div className="relative aspect-[16/11] rounded-xl overflow-hidden">
        <img src={c.image} alt={c.title} loading="lazy" width={1280} height={896} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {isExpired ? (
          <Badge className="absolute top-2 start-2 bg-[var(--success)] text-white border-0 gap-1">
            <CheckCircle2 className="h-3 w-3" /> SOLD
          </Badge>
        ) : (
          <Badge className="absolute top-2 start-2 bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
            <Radio className="h-3 w-3" /> LIVE
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{c.brand} · {c.year}</div>
        <h3 className="font-display text-xl font-bold">{c.title}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {c.viewers} {t("car_watching")}</span>
          <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-400" /> {c.bids} {t("auctions_bids")}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {c.city}</span>
        </div>
        {c.endsAt && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{isExpired ? "Ended" : t("auctions_ends_in")}</span>
            {!isExpired && <CountdownTimer endsAt={c.endsAt} className="font-display font-semibold text-[var(--live)]" />}
          </div>
        )}
      </div>

      <div className="text-start md:text-end space-y-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            {isExpired ? "Final Price" : t("card_current_bid")}
          </div>
          <div className="font-display text-2xl font-bold text-gradient-primary">{formatPrice(c.currentBid ?? c.price)}</div>
          {!isExpired && <div className="text-xs text-muted-foreground mt-1">Min +{formatPrice(c.minRaise)}</div>}
        </div>
        {!isExpired && (
          <Button className="bg-gradient-primary border-0 text-primary-foreground shadow-glow w-full sm:w-auto">
            <Gavel className="h-4 w-4" /> {t("auctions_bid_now")}
          </Button>
        )}
      </div>
    </Link>
  );
}

function AuctionsPage() {
  const { live, upcoming } = Route.useLoaderData();
  const { t } = useLanguage();
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const endingSoon = live.filter((c) => c.endsAt != null && now > 0 && c.endsAt - now < 60 * 60 * 1000 && c.endsAt > now);
  const liveRest = live.filter((c) => !endingSoon.some((e) => e.id === c.id));

  return (
    <div className="min-h-screen pb-nav">
      <PageMeta titleKey="auctions_title" descriptionKey="seo_auctions_desc" />
      <Header />
      <div className="page-content max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--live)] font-semibold">{live.length} {t("live_now")}</span>
        </div>
        <h1 className="font-display text-2xl sm:text-5xl font-bold">{t("auctions_title").split(" ")[0]} <span className="text-gradient-primary">{t("auctions_title").split(" ").slice(1).join(" ")}</span></h1>
        <p className="text-muted-foreground mt-2 max-w-xl">{t("auctions_p")}</p>

        <div className="flex gap-3 mt-5">
          <Button asChild variant="outline" className="glass gap-2">
            <Link to="/calendar"><Calendar className="h-4 w-4" /> {t("auctions_calendar")}</Link>
          </Button>
          <Button asChild variant="outline" className="glass gap-2">
            <Link to="/sold"><CheckCircle2 className="h-4 w-4" /> {t("auctions_sold_link")}</Link>
          </Button>
        </div>

        {live.length === 0 ? (
          <div className="mt-16 text-center py-20 rounded-3xl border border-border/40 glass-strong">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">{t("auctions_none_title")}</h3>
            <p className="text-muted-foreground">{t("auctions_none_p")}</p>
            <Button asChild className="mt-6 bg-gradient-primary border-0 text-primary-foreground">
              <Link to="/browse" search={{ q: "" }}>{t("auctions_browse")}</Link>
            </Button>
          </div>
        ) : (
          <>
            {endingSoon.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-400" /> Ending soon
                </h2>
                <div className="space-y-4">
                  {endingSoon.map((c) => (
                    <AuctionRow key={c.id} c={c} now={now} />
                  ))}
                </div>
              </div>
            )}
            <div className="mt-10">
              <h2 className="font-display text-xl font-bold mb-4">{t("live_now")}</h2>
              <div className="space-y-4">
                {(endingSoon.length ? liveRest : live).map((c) => (
                  <AuctionRow key={c.id} c={c} now={now} />
                ))}
              </div>
            </div>
          </>
        )}

        {upcoming.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">{t("auctions_upcoming")}</span>
                <h2 className="font-display text-2xl font-bold mt-1">{t("auctions_upcoming_title")}</h2>
              </div>
              <Button asChild variant="ghost">
                <Link to="/browse" search={{ q: "" }}>{t("view_all")} <ArrowRight className="h-4 w-4" /></Link>
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
