import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { getCarsFromDb, markExpiredAuctions } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { PageMeta } from "@/components/PageMeta";

const PAGE_SIZE = 12;
const PRICE_CEILING = 100_000_000;

type SortKey = "newest" | "price_asc" | "price_desc" | "mileage_asc" | "year_desc";
const SORT_KEYS = [
  { key: "newest" as const, labelKey: "browse_sort_newest" as const },
  { key: "price_asc" as const, labelKey: "browse_sort_price_asc" as const },
  { key: "price_desc" as const, labelKey: "browse_sort_price_desc" as const },
  { key: "mileage_asc" as const, labelKey: "browse_sort_mileage_asc" as const },
  { key: "year_desc" as const, labelKey: "browse_sort_year_desc" as const },
];

export const Route = createFileRoute("/browse")({
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
  const [transmission, setTransmission] = useState("");
  const [accidentFilter, setAccidentFilter] = useState<"all" | "none" | "yes">("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(PRICE_CEILING);
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
  const transmissions = Array.from(new Set(cars.map((c) => c.transmission))).sort();

  // Defer Date to client-side only — avoids SSR/hydration mismatch
  useEffect(() => {
    const yr = new Date().getFullYear();
    setCurrentYear(yr);
    setMaxYear(yr);
  }, []);

  useEffect(() => { if (initialQ) setQ(initialQ); }, [initialQ]);
  useEffect(() => { setPage(1); }, [q, brand, city, fuel, transmission, accidentFilter, minPrice, maxPrice, minYear, maxYear, onlyLive, carType, sort]);

  const filtered = useMemo(() => {
    let result = cars.filter((c) => {
      if (q && !`${c.title} ${c.brand} ${c.model} ${c.city}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (brand && c.brand !== brand) return false;
      if (city && c.city !== city) return false;
      if (fuel && c.fuel !== fuel) return false;
      if (transmission && c.transmission !== transmission) return false;
      if (accidentFilter === "none" && c.accidentHistory) return false;
      if (accidentFilter === "yes" && !c.accidentHistory) return false;
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
  }, [q, brand, city, fuel, transmission, accidentFilter, minPrice, maxPrice, minYear, maxYear, onlyLive, carType, sort, cars]);

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  const isPriceFiltered = minPrice > 0 || maxPrice < PRICE_CEILING;
  const isYearFiltered = minYear > 2000 || maxYear < currentYear;

  const activeFiltersCount = [brand, city, fuel, transmission, accidentFilter !== "all", isPriceFiltered, isYearFiltered, onlyLive, q.length > 0, carType !== "all"]
    .filter(Boolean).length;

  const resetAll = () => {
    setBrand(""); setCity(""); setFuel(""); setTransmission(""); setAccidentFilter("all");
    setMinPrice(0); setMaxPrice(PRICE_CEILING);
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
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_fuel")}</label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFuel("")} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${fuel === "" ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{t("browse_all")}</button>
          {fuels.map((f) => <button key={f} onClick={() => setFuel(f)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${fuel === f ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{f}</button>)}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_transmission")}</label>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setTransmission("")} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${transmission === "" ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{t("browse_all")}</button>
          {transmissions.map((tr) => <button key={tr} onClick={() => setTransmission(tr)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${transmission === tr ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{tr}</button>)}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_accidents")}</label>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "none", "yes"] as const).map((opt) => (
            <button key={opt} onClick={() => setAccidentFilter(opt)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${accidentFilter === opt ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>
              {opt === "all" ? t("browse_accidents_all") : opt === "none" ? t("browse_accidents_none") : t("browse_accidents_yes")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_price_range")}</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground mb-1 block">{t("browse_min")}</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={minPrice === 0 ? "" : minPrice}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { setMinPrice(0); return; }
                const v = Number(raw);
                if (!Number.isNaN(v) && v >= 0) setMinPrice(Math.min(v, maxPrice - 1));
              }}
              placeholder="0"
              className="h-9 text-sm bg-background/50"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground mb-1 block">{t("browse_max")}</span>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={maxPrice >= PRICE_CEILING ? "" : maxPrice}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") { setMaxPrice(PRICE_CEILING); return; }
                const v = Number(raw);
                if (!Number.isNaN(v) && v > minPrice) setMaxPrice(v);
              }}
              placeholder={t("browse_any")}
              className="h-9 text-sm bg-background/50"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("browse_year_range")}</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground mb-1 block">{t("browse_from")}</span>
            <Input
              type="number"
              min={1990}
              max={currentYear}
              inputMode="numeric"
              value={minYear}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 1990 && v <= maxYear) setMinYear(v);
              }}
              className="h-9 text-sm bg-background/50"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground mb-1 block">{t("browse_to")}</span>
            <Input
              type="number"
              min={1990}
              max={currentYear}
              inputMode="numeric"
              value={maxYear}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= minYear && v <= currentYear) setMaxYear(v);
              }}
              className="h-9 text-sm bg-background/50"
            />
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
    <div className="min-h-screen pb-nav">
      <PageMeta titleKey="browse_title" descriptionKey="seo_browse_desc" />
      <Header />

      <div className="sticky-below-header md:hidden glass-strong border-b border-border/40 px-4 py-2.5">
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

      <div className="page-content max-w-7xl py-6 md:py-10">
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-headline-lg font-display font-bold">{t("browse_title")}</h1>
            <p className="text-muted-foreground mt-2">{t("browse_results", { n: filtered.length })} {t("browse_of_total", { n: cars.length })}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-background/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {SORT_KEYS.map((o) => <option key={o.key} value={o.key}>{t(o.labelKey)}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="md:hidden mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("browse_results", { n: filtered.length })}</p>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && <button className="text-xs text-primary-glow underline" onClick={resetAll}>{t("browse_reset")}</button>}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="bg-background/50 border border-border rounded-lg px-2 py-1 text-xs outline-none">
              {SORT_KEYS.map((o) => <option key={o.key} value={o.key}>{t(o.labelKey)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden lg:block space-y-5 h-fit lg:sticky-below-header glass-strong rounded-2xl p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <SlidersHorizontal className="h-4 w-4 text-primary-glow" />
              <span className="text-label-caps text-muted-foreground">{t("browse_filters")}</span>
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
                  {displayed.map((c) => <CarCard key={c.id} car={c} />)}
                </div>
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button variant="outline" className="glass gap-2 px-8" onClick={() => setPage((p) => p + 1)}>
                      {t("browse_load_more")} ({t("browse_remaining", { n: filtered.length - displayed.length })})
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
