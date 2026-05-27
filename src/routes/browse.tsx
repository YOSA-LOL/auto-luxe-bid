import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { getCarsFromDb } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { formatNumber } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";

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
    const cars = await getCarsFromDb();
    return { cars: cars.map(dbCarToApp) };
  },
  component: BrowsePage,
});

function BrowsePage() {
  const { cars } = Route.useLoaderData();
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [brand, setBrand] = useState("All Brands");
  const [city, setCity] = useState("All Cities");
  const [maxPrice, setMaxPrice] = useState(100_000_000);
  const [onlyLive, setOnlyLive] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const brands = ["All Brands", ...Array.from(new Set(cars.map((c) => c.brand))).sort()];
  const cities = ["All Cities", ...Array.from(new Set(cars.map((c) => c.city))).sort()];

  useEffect(() => {
    if (initialQ) setQ(initialQ);
  }, [initialQ]);

  const filtered = useMemo(() => {
    return cars.filter((c) => {
      if (q && !`${c.title} ${c.brand} ${c.model}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (brand !== "All Brands" && c.brand !== brand) return false;
      if (city !== "All Cities" && c.city !== city) return false;
      if ((c.isLive ? c.currentBid! : c.price) > maxPrice) return false;
      if (onlyLive && !c.isLive) return false;
      return true;
    });
  }, [q, brand, city, maxPrice, onlyLive, cars]);

  const activeFiltersCount = [
    brand !== "All Brands",
    city !== "All Cities",
    maxPrice < 100_000_000,
    onlyLive,
    q.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen pb-nav md:pb-0">
      <Header />

      {/* Mobile sticky search bar */}
      <div className="sticky top-14 z-40 md:hidden glass-strong border-b border-border/40 px-4 py-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Brand, model, city…"
              className="pl-9 bg-background/50 h-9 text-sm"
            />
          </div>
          <button
            onClick={() => setShowMobileFilters(true)}
            className={`relative flex items-center gap-1.5 px-3 rounded-lg border transition-smooth text-sm font-medium ${activeFiltersCount > 0 ? "bg-primary/10 border-primary/40 text-primary-glow" : "glass border-border/40"}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFiltersCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="hidden md:block mb-8">
          <h1 className="font-display text-4xl font-bold">Browse <span className="text-gradient-primary">Cars</span></h1>
          <p className="text-muted-foreground mt-2">{filtered.length} of {cars.length} vehicles match your filters</p>
        </div>
        <div className="md:hidden mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} cars found</p>
          {activeFiltersCount > 0 && (
            <button
              className="text-xs text-primary-glow underline"
              onClick={() => { setBrand("All Brands"); setCity("All Cities"); setMaxPrice(100_000_000); setOnlyLive(false); setQ(""); }}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block space-y-5 glass-strong rounded-2xl p-5 h-fit lg:sticky lg:top-20">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <SlidersHorizontal className="h-4 w-4 text-primary-glow" />
              <span className="font-display font-semibold text-sm">Filters</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brand, model…" className="pl-9 bg-background/40 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Brand</label>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b) => (
                  <button key={b} onClick={() => setBrand(b)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${brand === b ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{b}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => (
                  <button key={c} onClick={() => setCity(c)} className={`px-2.5 py-1 rounded-lg text-xs transition-smooth ${city === c ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Max Price</label>
                <span className="text-xs font-display font-semibold text-primary-glow">EGP {formatNumber(maxPrice)}</span>
              </div>
              <Slider value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} min={500_000} max={100_000_000} step={100_000} className="py-1" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`h-5 w-9 rounded-full transition-smooth relative ${onlyLive ? "bg-[var(--live)]" : "bg-secondary"}`} onClick={() => setOnlyLive(!onlyLive)}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-smooth ${onlyLive ? "left-4" : "left-0.5"}`} />
              </div>
              <span className="text-sm">Live auctions only</span>
              {onlyLive && <Badge className="bg-[var(--live)] text-white border-0 text-[10px] px-1.5 animate-pulse-live">ON</Badge>}
            </label>
          </aside>

          <div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">No cars found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5">
                {filtered.map((c) => <CarCard key={c.id} car={c} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters bottom sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={() => setShowMobileFilters(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div
            className="relative w-full glass-strong border-t border-border/60 rounded-t-3xl p-5 space-y-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="font-display font-semibold">Filters</span>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    className="text-xs text-muted-foreground underline"
                    onClick={() => { setBrand("All Brands"); setCity("All Cities"); setMaxPrice(100_000_000); setOnlyLive(false); }}
                  >
                    Clear all
                  </button>
                )}
                <button onClick={() => setShowMobileFilters(false)} className="h-8 w-8 rounded-full glass flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Brand</label>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <button key={b} onClick={() => setBrand(b)} className={`px-3 py-1.5 rounded-xl text-sm transition-smooth ${brand === b ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{b}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => (
                  <button key={c} onClick={() => setCity(c)} className={`px-3 py-1.5 rounded-xl text-sm transition-smooth ${city === c ? "bg-gradient-primary text-primary-foreground" : "glass"}`}>{c}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Max Price</label>
                <span className="text-sm font-display font-semibold text-primary-glow">EGP {formatNumber(maxPrice)}</span>
              </div>
              <Slider value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} min={500_000} max={100_000_000} step={100_000} className="py-1" />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`h-6 w-11 rounded-full transition-smooth relative ${onlyLive ? "bg-[var(--live)]" : "bg-secondary"}`} onClick={() => setOnlyLive(!onlyLive)}>
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-smooth ${onlyLive ? "left-6" : "left-1"}`} />
              </div>
              <span className="text-sm font-medium">Live auctions only</span>
            </label>

            <Button
              className="w-full bg-gradient-primary border-0 text-primary-foreground h-12"
              onClick={() => setShowMobileFilters(false)}
            >
              Show {filtered.length} cars
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
