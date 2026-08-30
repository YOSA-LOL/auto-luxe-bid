import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { getCarsFromDb, markExpiredAuctions } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatNumber, formatPrice } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X, ArrowUpDown, GitCompare } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { getCompareIds, clearCompare, removeFromCompare } from "@/lib/compare";

const PAGE_SIZE = 12;

type SortKey = "newest" | "price_asc" | "price_desc" | "mileage_asc" | "year_desc";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "mileage_asc", label: "Lowest Mileage" },
  { key: "year_desc", label: "Newest Model" },
];

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse Cars — APEXAuto" },
      { name: "description", content: "Browse all verified used cars and live auctions." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
  }),
  loader: async () => {
    await markExpiredAuctions();
    const cars = await getCarsFromDb();
    return { cars: cars.map(dbCarToApp) };
  },
  component: BrowsePage,
});

function BrowsePage() {
  const { cars } = Route.useLoaderData();
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [brand, setBrand] = useState("");
  const [city, setCity] = useState("");
  const [fuel, setFuel] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100_000_000);
  const [minYear, setMinYear] = useState(2000);
  // SSR-safe: initialise above the highest inventory year so no cars are excluded
  // before the useEffect below snaps these to the real current year on the client.
  const ssrYearCap = Math.max(2030, ...cars.map((c) => c.year));
  const [maxYear, setMaxYear] = useState(ssrYearCap);
  const [currentYear, setCurrentYear] = useState(ssrYearCap);
  const [onlyLive, setOnlyLive] = useState(false);
  const [carType, setCarType] = useState<"all" | "new" | "used">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { t } = useLanguage();

  const brands = Array.from(new Set(cars.map((c) => c.brand))).sort();
  const cities = Array.from(new Set(cars.map((c) => c.city))).sort();
  const fuels = Array.from(new Set(cars.map((c) => c.fuel))).sort();

  // Defer Date to client-side only — avoids SSR/hydration mismatch
  useEffect(() => {
    const yr = new Date().getFullYear();
    setCurrentYear(yr);
    setMaxYear(yr);
  }, []);

  useEffect(() => { if (initialQ) setQ(initialQ); }, [initialQ]);
  useEffect(() => { setPage(1); }, [q, brand, city, fuel, minPrice, maxPrice, minYear, maxYear, onlyLive, carType, sort]);

  useEffect(() => {
    setCompareIds(getCompareIds());
    const handler = () => setCompareIds(getCompareIds());
    window.addEventListener("apex_compare_changed", handler);
    return () => window.removeEventListener("apex_compare_changed", handler);
  }, []);

  const filtered = useMemo(() => {
    let result = cars.filter((c) => {
      if (q && !`${c.title} ${c.brand} ${c.model} ${c.city} ${c.dealership}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (brand && c.brand !== brand) return false;
      if (city && c.city !== city) return false;
      if (fuel && c.fuel !== fuel) return false;
      const price = c.isLive ? c.currentBid ?? c.price : c.price;
      if (price < minPrice || price > maxPrice) return false;
      if (c.year < minYear || c.year > maxYear) return false;
      if (onlyLive && !c.isLive) return false;
      if (carType === "new" && !c.isNew) return false;
      if (carType === "used" && c.isNew) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      const pa = a.isLive ? a.currentBid ?? a.price : a.price;
      const pb = b.isLive ? b.currentBid ?? b.price : b.price;
      if (sort === "price_asc") return pa - pb;
      if (sort === "price_desc") return pb - pa;
      if (sort === "mileage_asc") return a.mileage - b.mileage;
      if (sort === "year_desc") return b.year - a.year;
      return 0;
    });

    return result;
  }, [q, brand, city, fuel, minPrice, maxPrice, minYear, maxYear, onlyLive, carType, sort, cars]);

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  const isPriceFiltered = minPrice > 0 || maxPrice < 100_000_000;
  const isYearFiltered = minYear > 2000 || maxYear < currentYear;

  const activeFiltersCount = [brand, city, fuel, isPriceFiltered, isYearFiltered, onlyLive, q.length > 0, carType !== "all"]
    .filter(Boolean).length;

  const resetAll = () => {
    setBrand(""); setCity(""); setFuel(""); setMinPrice(0); setMaxPrice(100_000_000);
    setMinYear(2000); setMaxYear(currentYear);
    setOnlyLive(false); setCarType("all"); setQ(""); setSort("newest");
  };

  const SidebarFilters = () => (
    <>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("search_btn")}</label>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("browse_mobile_ph")} className="ps-9 bg-background/40 h-9 text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_car_type")}</label>
        <div className="flex gap-1.5">
          {(["all", "new", "used"] as const).map((type) => (
            <button key={type} onClick={() => setCarType(type)}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-smooth ${carType === type ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>
              {type === "all" ? t("browse_type_all") : type === "new" ? t("new_cars_label") : t("used_cars_label")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_brand")}</label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setBrand("")} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${brand === "" ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{t("browse_all_brands")}</button>
          {brands.map((b) => <button key={b} onClick={() => setBrand(b)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${brand === b ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{b}</button>)}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_city")}</label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCity("")} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${city === "" ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{t("browse_all_cities")}</button>
          {cities.map((c) => <button key={c} onClick={() => setCity(c)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${city === c ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{c}</button>)}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Fuel Type</label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFuel("")} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${fuel === "" ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>All</button>
          {fuels.map((f) => <button key={f} onClick={() => setFuel(f)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${fuel === f ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{f}</button>)}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Price Range</label>
          <span className="text-xs font-display font-semibold text-primary-glow">
            {formatPrice(minPrice)} – {maxPrice >= 100_000_000 ? "Any" : formatPrice(maxPrice)}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground w-6">Min</span>
            <Slider value={[minPrice]} onValueChange={([v]) => { if (v < maxPrice) setMinPrice(v); }} min={0} max={100_000_000} step={100_000} className="py-1 flex-1" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground w-6">Max</span>
            <Slider value={[maxPrice]} onValueChange={([v]) => { if (v > minPrice) setMaxPrice(v); }} min={0} max={100_000_000} step={100_000} className="py-1 flex-1" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Year Range</label>
          <span className="text-xs font-display font-semibold text-primary-glow">{minYear} – {maxYear}</span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground w-6">From</span>
            <Slider value={[minYear]} onValueChange={([v]) => { if (v <= maxYear) setMinYear(v); }} min={1990} max={currentYear} step={1} className="py-1 flex-1" />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground w-6">To</span>
            <Slider value={[maxYear]} onValueChange={([v]) => { if (v >= minYear) setMaxYear(v); }} min={1990} max={currentYear} step={1} className="py-1 flex-1" />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div className={`h-5 w-9 rounded-full transition-smooth relative ${onlyLive ? "bg-[var(--live)]" : "bg-secondary"}`} onClick={() => setOnlyLive(!onlyLive)}>
          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-smooth ${onlyLive ? "start-4" : "start-0.5"}`} />
        </div>
        <span className="text-sm">{t("browse_live_only")}</span>
        {onlyLive && <Badge className="bg-[var(--live)] text-white border-0 text-[10px] px-1.5 animate-pulse-live">ON</Badge>}
      </label>

      {activeFiltersCount > 0 && (
        <button className="text-xs text-muted-foreground underline" onClick={resetAll}>{t("browse_reset")}</button>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-nav md:pb-0">
      <Header />

      <div className="sticky top-14 z-40 md:hidden glass-strong border-b border-border/40 px-4 py-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("browse_mobile_ph")} className="ps-9 bg-background/50 h-9 text-sm" />
          </div>
          <button
            onClick={() => setShowMobileFilters(true)}
            className={`relative flex items-center gap-1.5 px-3 rounded-lg border transition-smooth text-sm font-medium ${activeFiltersCount > 0 ? "bg-primary/10 border-primary/40 text-primary-glow" : "glass border-border/40"}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFiltersCount > 0 && <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{activeFiltersCount}</span>}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold">{t("browse_title")}</h1>
            <p className="text-muted-foreground mt-2">{t("browse_results", { n: filtered.length })} of {cars.length}</p>
          </div>
          <div className="flex items-center gap-3">
            {compareIds.length > 0 && (
              <Button asChild variant="outline" className="glass gap-2 border-primary/40 text-primary-glow">
                <Link to="/compare">
                  <GitCompare className="h-4 w-4" />
                  Compare ({compareIds.length})
                </Link>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="md:hidden mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("browse_results", { n: filtered.length })}</p>
          <div className="flex items-center gap-2">
            {compareIds.length > 0 && (
              <Link to="/compare" className="flex items-center gap-1 text-xs text-primary-glow border border-primary/30 px-2 py-1 rounded-lg glass">
                <GitCompare className="h-3 w-3" /> Compare ({compareIds.length})
              </Link>
            )}
            {activeFiltersCount > 0 && <button className="text-xs text-primary-glow underline" onClick={resetAll}>{t("browse_reset")}</button>}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="bg-background/50 border border-border rounded-lg px-2 py-1 text-xs outline-none">
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden lg:block space-y-5 glass-strong rounded-2xl p-5 h-fit lg:sticky lg:top-20">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <SlidersHorizontal className="h-4 w-4 text-primary-glow" />
              <span className="font-display font-semibold text-sm">{t("browse_filters")}</span>
              {activeFiltersCount > 0 && <Badge className="ms-auto bg-primary/20 text-primary-glow border-0 text-[10px]">{t("browse_active", { n: activeFiltersCount })}</Badge>}
            </div>
            <SidebarFilters />
          </aside>

          <div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">{t("browse_no_results")}</h3>
                <button className="text-sm text-primary-glow underline mt-2" onClick={resetAll}>{t("browse_reset_filters")}</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5">
                  {displayed.map((c) => <CarCard key={c.id} car={c} showCompare />)}
                </div>
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button variant="outline" className="glass gap-2 px-8" onClick={() => setPage((p) => p + 1)}>
                      Load More ({filtered.length - displayed.length} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {compareIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 start-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="glass-strong border border-primary/40 rounded-2xl px-4 py-3 flex items-center gap-4 shadow-elegant">
            <GitCompare className="h-4 w-4 text-primary-glow shrink-0" />
            <span className="text-sm font-medium">{compareIds.length} car{compareIds.length > 1 ? "s" : ""} selected</span>
            <Button asChild size="sm" className="bg-gradient-primary border-0 text-primary-foreground h-8 text-xs">
              <Link to="/compare">Compare Now</Link>
            </Button>
            <button onClick={() => { clearCompare(); setCompareIds([]); }} className="text-muted-foreground hover:text-foreground transition-smooth">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={() => setShowMobileFilters(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div className="relative w-full glass-strong border-t border-border/60 rounded-t-3xl p-5 space-y-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="font-display font-semibold">{t("browse_filters")}</span>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && <button className="text-xs text-muted-foreground underline" onClick={resetAll}>{t("browse_reset")}</button>}
                <button onClick={() => setShowMobileFilters(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <SidebarFilters />
            <Button className="w-full bg-gradient-primary border-0 text-primary-foreground h-12" onClick={() => setShowMobileFilters(false)}>
              {t("browse_results", { n: filtered.length })}
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
