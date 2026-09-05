import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Route as RootRoute } from "@/routes/__root";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { getCarsFromDb, getLiveCarsFromDb, markExpiredAuctions } from "@/lib/cars.server";
import { getHeroCarPin } from "@/lib/auction-entry.server";
import { dbCarToApp, type AppCar } from "@/lib/types";
import { formatNumber } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Zap, Radio, GitCompare, Search, Gavel, Clock } from "lucide-react";
import heroCarStaticImg from "@/assets/hero-car.jpg";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language";
import { PageMeta } from "@/components/PageMeta";
import { useThemeMode } from "@/lib/theme-mode";

export const Route = createFileRoute("/")({
  loader: async () => {
    // Mark expired auctions before fetching so stale live cars are excluded
    await markExpiredAuctions();
    const [allCars, liveCars, pinnedId] = await Promise.all([
      getCarsFromDb(), getLiveCarsFromDb(), getHeroCarPin(),
    ]);
    const appCars = allCars.map(dbCarToApp);
    const appLive = liveCars.map(dbCarToApp);
    const now = Date.now();

    let heroCar: AppCar | null = null;

    // 1. Admin-pinned car
    if (pinnedId) {
      heroCar = appCars.find((c) => c.id === pinnedId) ?? null;
    }

    // 2. Live car ending soonest — only genuinely live (ends_at in the future)
    if (!heroCar && appLive.length > 0) {
      const activeLive = appLive.filter((c) => c.endsAt == null || c.endsAt > now);
      const pool = activeLive.length > 0 ? activeLive : appLive;
      const withEnd = pool.filter((c) => c.endsAt != null);
      heroCar = withEnd.length > 0
        ? withEnd.sort((a, b) => (a.endsAt ?? 0) - (b.endsAt ?? 0))[0]
        : pool[0];
    }

    // 3. Best car by specs: featured first, then highest hp, then highest price
    if (!heroCar && appCars.length > 0) {
      heroCar = [...appCars].sort((a, b) => {
        if (b.featured !== a.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        return (b.hp ?? 0) - (a.hp ?? 0) || b.price - a.price;
      })[0];
    }

    return { cars: appCars, liveCars: appLive, heroCar };
  },
  component: Index,
});

function Index() {
  const { cars, liveCars, heroCar } = Route.useLoaderData();
  const { user } = RootRoute.useRouteContext();
  const newCars = cars.filter((c) => c.isNew).slice(0, 6);
  const usedCars = cars.filter((c) => !c.isNew).slice(0, 6);
  const [searchQ, setSearchQ] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isLight } = useThemeMode();

  // SSR-safe countdown: start null, hydrate after mount
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: searchQ } });
  };

  // Countdown helper for live auctions
  const getCountdown = (endsAt: number): string => {
    const diff = endsAt - (now ?? endsAt);
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="min-h-screen pb-nav">
      <PageMeta titleKey="site_home_title" descriptionKey="seo_home_desc" />
      <Header />

      {/* HERO */}
      {isLight ? (
        <section className="aether-hero-light relative min-h-[calc(100dvh-var(--header-h)-4rem)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={heroCar?.image || heroCar?.images?.[0] || heroCarStaticImg}
              alt=""
              className="w-full h-full object-cover opacity-50 saturate-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f4f7f9] via-[#f4f7f9]/75 to-[#f4f7f9]/40" />
            <div className="absolute top-1/4 start-1/4 h-72 w-72 rounded-full bg-primary-container/20 blur-3xl animate-pulse" style={{ animationDuration: "5s" }} />
            <div className="absolute bottom-1/4 end-1/4 h-64 w-64 rounded-full bg-primary/15 blur-3xl animate-pulse" style={{ animationDuration: "7s" }} />
          </div>
          <div className="relative z-10 w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col items-center text-center pb-10 sm:pb-16 animate-fade-up">
            <h1 className="font-display text-2xl sm:text-headline-xl font-bold leading-[1.08] tracking-tighter max-w-4xl mb-4 sm:mb-6">
              {t("hero_h1_1")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006875] via-[#00838f] to-[#00e5ff]">
                {t("hero_h1_2")}
              </span>{" "}
              {t("hero_h1_3")}
            </h1>
            <p className="text-base sm:text-lg text-[#334155] max-w-2xl mb-10 leading-relaxed font-medium">
              {t("hero_p")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground border-0 px-8 py-6 h-auto text-label-caps">
                <Link to="/browse" search={{ q: "" }}>
                  {t("hero_btn_browse")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8 py-6 h-auto text-label-caps border-[#94a3b8]/50 text-foreground hover:border-primary hover:text-primary bg-white/80 backdrop-blur-sm">
                <Link to="/auctions">{t("hero_btn_auction")}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-6 sm:gap-10 max-w-lg w-full pt-4 border-t border-[#dbe4ee]/80">
              {[
                { v: `${cars.length}+`, l: t("hero_stat_listed") },
                { v: `${liveCars.length}`, l: t("hero_stat_live") },
                { v: "98%", l: t("hero_stat_verified") },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="font-display text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#006875] to-[#00e5ff]">{s.v}</div>
                  <div className="text-label-caps text-[#64748b] mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 dark-only-fx" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full animate-pulse dark-only-fx"
             style={{ background: "var(--gradient-glow)", animationDuration: "4s" }} />
        <div className="absolute top-1/3 end-0 h-64 w-64 rounded-full opacity-30 blur-3xl hero-accent-orb dark-only-fx" />

        <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-10 sm:pb-16 lg:pt-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            <div className="space-y-3 sm:space-y-7 animate-fade-up order-1">
              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.08] sm:leading-[1.05] tracking-tight">
                {t("hero_h1_1")} <br />
                <span className="text-gradient-primary">{t("hero_h1_2")}</span> <br />
                {t("hero_h1_3")}
              </h1>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t("hero_p")}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
                <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground border-0 shadow-glow sm:h-12 px-4 sm:px-6">
                  <Link to="/auctions">
                    <Gavel className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t("hero_btn_auction")}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="glass sm:h-12 px-4 sm:px-6">
                  <Link to="/browse" search={{ q: "" }}>
                    {t("hero_btn_browse")} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-3 sm:pt-8 max-w-md">
                {[
                  { v: `${cars.length}+`, l: t("hero_stat_listed") },
                  { v: `${liveCars.length}`, l: t("hero_stat_live") },
                  { v: "98%", l: t("hero_stat_verified") },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-display text-lg sm:text-2xl font-bold text-gradient-primary">{s.v}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-up order-2">
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-glow opacity-50 sm:opacity-70 blur-2xl sm:blur-3xl" />
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-primary/30 shadow-elegant shadow-neon sm:animate-float scanlines">

                {/* Car image — fall back to static hero if car has no image */}
                {(() => {
                  const imgSrc = heroCar?.image || heroCar?.images?.[0] || heroCarStaticImg;
                  return (
                    <img
                      src={imgSrc}
                      alt={heroCar ? `${heroCar.brand} ${heroCar.model}` : "Featured car"}
                      width={1920}
                      height={1280}
                      className="w-full object-cover aspect-[16/9]"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = heroCarStaticImg; }}
                    />
                  );
                })()}

                <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />

                {heroCar && (
                  <>
                    {/* Top bar: live badge + viewers / year */}
                    <div className="absolute top-4 start-4 end-4 flex justify-between items-start">
                      {heroCar.isLive ? (
                        <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1.5 px-3 py-1">
                          <Radio className="h-3 w-3" /> LIVE NOW
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="glass border-border/60 text-xs px-3 py-1">
                          {heroCar.isNew ? "New" : "Pre-owned"}
                        </Badge>
                      )}
                      <div className="glass-strong rounded-lg px-3 py-2 text-end">
                        {heroCar.isLive ? (
                          <>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("hero_viewers")}</div>
                            <div className="font-display font-bold tabular-nums">{heroCar.viewers}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Year</div>
                            <div className="font-display font-bold tabular-nums">{heroCar.year}</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom bar: name + price + countdown + CTA */}
                    <div className="absolute bottom-4 start-4 end-4 glass-strong rounded-xl p-4">
                      <div className="flex justify-between items-end gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            <span>{heroCar.brand} · {heroCar.year}</span>
                            {heroCar.isLive && heroCar.endsAt && now != null && (
                              <span className="inline-flex items-center gap-1 text-[var(--live)]">
                                <Clock className="h-3 w-3" />
                                {getCountdown(heroCar.endsAt)}
                              </span>
                            )}
                          </div>
                          <div className="font-display text-base sm:text-lg md:text-xl font-bold truncate">
                            EGP {formatNumber(heroCar.isLive ? (heroCar.currentBid ?? heroCar.price) : heroCar.price)}
                          </div>
                        </div>
                        <Button asChild size="sm" className="bg-gradient-primary border-0 text-primary-foreground shrink-0">
                          <Link to="/cars/$carId" params={{ carId: heroCar.id }}>
                            {heroCar.isLive ? t("hero_bid_now") : "View"}
                          </Link>
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
      )}

      {/* FLOATING SEARCH — light mode only */}
      {isLight && (
      <section className="relative px-3 sm:px-6 lg:px-8 mt-0 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl rounded-2xl p-3 aether-glass-panel border border-white/50">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-background/40 rounded-xl">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={t("search_placeholder")}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="bg-gradient-primary border-0 text-primary-foreground h-12 px-8">
              {t("search_btn")}
            </Button>
          </form>
        </div>
      </section>
      )}

      {/* LIVE STRIP */}
      {liveCars.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-6 sm:mt-24 aether-section">
          <div className="flex items-end justify-between mb-4 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <span className="h-2 w-2 rounded-full bg-[var(--live)] animate-pulse-live" />
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--live)] font-semibold">{t("live_now")}</span>
              </div>
              <h2 className={`font-display text-xl sm:text-4xl font-bold ${isLight ? "aether-section-title" : ""}`}>{t("bidding_in_progress")}</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/auctions">{t("view_all")} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {liveCars.slice(0, 3).map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        </section>
      )}

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-6 sm:mt-24 aether-section">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-5">
          {[
            { icon: ShieldCheck, t: t("feat1_title"), d: t("feat1_desc") },
            { icon: Zap, t: t("feat2_title"), d: t("feat2_desc") },
            { icon: GitCompare, t: t("feat3_title"), d: t("feat3_desc") },
          ].map((f) => (
            <div key={f.t} className={`flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 rounded-xl sm:rounded-2xl p-3 sm:p-7 hover-lift ${isLight ? "aether-feature-card" : "bg-gradient-card border border-border/60 cyber-card"}`}>
              <div className={`h-9 w-9 shrink-0 sm:h-11 sm:w-11 rounded-full sm:rounded-full flex items-center justify-center sm:mb-4 ${isLight ? "bg-primary-container/20 text-primary" : "rounded-lg sm:rounded-xl bg-gradient-primary shadow-glow shadow-neon"}`}>
                <f.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isLight ? "" : "text-primary-foreground"}`} />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-lg font-semibold sm:mb-2">{f.t}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEW CARS */}
      {newCars.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-6 sm:mt-24 aether-section">
          <div className="flex items-end justify-between mb-4 sm:mb-8">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">{t("new_cars_label")}</span>
              <h2 className={`font-display text-xl sm:text-4xl font-bold mt-1 sm:mt-2 ${isLight ? "aether-section-title" : ""}`}>{t("new_cars_section")}</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/browse" search={{ q: "" }}>{t("all_cars")} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {newCars.map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        </section>
      )}

      {/* USED CARS */}
      {usedCars.length > 0 && (
        <section className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-6 sm:mt-24 aether-section">
          <div className="flex items-end justify-between mb-4 sm:mb-8">
            <div>
              <span className="text-label-caps text-warning">{t("used_cars_label")}</span>
              <h2 className={`font-display text-xl sm:text-4xl font-bold mt-1 sm:mt-2 ${isLight ? "aether-section-title" : ""}`}>{t("used_cars_section")}</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/browse" search={{ q: "" }}>{t("all_cars")} <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {usedCars.map((c) => <CarCard key={c.id} car={c} />)}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
