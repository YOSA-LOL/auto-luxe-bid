import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { CARS, BRANDS, CITIES } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse Cars — APEXAuto" },
      { name: "description", content: "Browse all verified used cars and live auctions." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("All Brands");
  const [city, setCity] = useState("All Cities");
  const [maxPrice, setMaxPrice] = useState(100_000_000);
  const [onlyLive, setOnlyLive] = useState(false);

  const filtered = useMemo(() => {
    return CARS.filter((c) => {
      if (q && !`${c.title} ${c.brand} ${c.model}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (brand !== "All Brands" && c.brand !== brand) return false;
      if (city !== "All Cities" && c.city !== city) return false;
      if ((c.isLive ? c.currentBid! : c.price) > maxPrice) return false;
      if (onlyLive && !c.isLive) return false;
      return true;
    });
  }, [q, brand, city, maxPrice, onlyLive]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold">Browse <span className="text-gradient-primary">Cars</span></h1>
          <p className="text-muted-foreground mt-2">{filtered.length} of {CARS.length} vehicles match your filters</p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Filters */}
          <aside className="space-y-5 glass-strong rounded-2xl p-5 h-fit lg:sticky lg:top-20">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-display font-semibold">Filters</span>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Search</label>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brand, model…" className="pl-9 bg-background/40" />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Brand</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrand(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-smooth ${
                      brand === b ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">City</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CITIES.map((b) => (
                  <button
                    key={b}
                    onClick={() => setCity(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-smooth ${
                      city === b ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Max Price (EGP)</label>
              <div className="mt-3">
                <Slider value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} min={1_000_000} max={100_000_000} step={500_000} />
                <div className="text-sm font-display font-semibold mt-2 text-gradient-primary">
                  {new Intl.NumberFormat("en-US").format(maxPrice)} EGP
                </div>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Live auctions only</span>
              <button
                onClick={() => setOnlyLive(!onlyLive)}
                className={`relative h-6 w-11 rounded-full transition-smooth ${onlyLive ? "bg-gradient-primary" : "bg-secondary"}`}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-smooth ${onlyLive ? "left-6" : "left-1"}`} />
              </button>
            </label>
          </aside>

          {/* Grid */}
          <div>
            {filtered.length === 0 ? (
              <div className="glass-strong rounded-2xl p-16 text-center">
                <Badge variant="outline" className="mb-3">No matches</Badge>
                <p className="text-muted-foreground">Try widening your filters.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((c) => <CarCard key={c.id} car={c} />)}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
