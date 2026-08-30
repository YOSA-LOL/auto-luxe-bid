import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCarsFromDb } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import type { AppCar } from "@/lib/types";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import { getCompareIds, removeFromCompare, clearCompare } from "@/lib/compare";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Gavel, CheckCircle2, CircleX } from "lucide-react";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Compare Cars — APEXAuto" }] }),
  loader: async () => {
    const cars = await getCarsFromDb();
    return { allCars: cars.map(dbCarToApp) };
  },
  component: ComparePage,
});

function ComparePage() {
  const { allCars } = Route.useLoaderData();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getCompareIds());
    const handler = () => setIds(getCompareIds());
    window.addEventListener("apex_compare_changed", handler);
    return () => window.removeEventListener("apex_compare_changed", handler);
  }, []);

  const cars = ids.map((id) => allCars.find((c) => c.id === id)).filter(Boolean) as AppCar[];

  const specs: { label: string; get: (c: AppCar) => string | number | null | undefined }[] = [
    { label: "Price", get: (c) => formatPrice(c.isLive ? c.currentBid ?? c.price : c.price) },
    { label: "Year", get: (c) => c.year },
    { label: "Mileage", get: (c) => `${formatNumber(c.mileage)} km` },
    { label: "Engine", get: (c) => c.engine },
    { label: "Horsepower", get: (c) => c.hp ? `${c.hp} hp` : null },
    { label: "Fuel", get: (c) => c.fuel },
    { label: "Transmission", get: (c) => c.transmission },
    { label: "Color", get: (c) => c.color },
    { label: "Seats", get: (c) => c.seats },
    { label: "Condition", get: (c) => c.condition },
    { label: "Accident History", get: (c) => c.accidentHistory ? "Yes" : "No" },
    { label: "City", get: (c) => c.city },
    { label: "Dealership", get: (c) => c.dealership },
  ];

  const remove = (id: string) => {
    removeFromCompare(id);
    setIds(getCompareIds());
  };

  return (
    <div className="min-h-screen pb-nav md:pb-0">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold">
              Compare <span className="text-gradient-primary">Cars</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {cars.length === 0 ? "Add cars from browse to compare side by side." : `Comparing ${cars.length} car${cars.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {cars.length > 0 && (
            <Button variant="outline" className="glass gap-2" onClick={() => { clearCompare(); setIds([]); }}>
              <X className="h-4 w-4" /> Clear All
            </Button>
          )}
        </div>

        {cars.length === 0 ? (
          <div className="text-center py-24 glass-strong rounded-3xl border border-border/40">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No cars to compare</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Go to Browse and click the compare icon on any car card to add it here.
            </p>
            <Button asChild className="bg-gradient-primary border-0 text-primary-foreground">
              <Link to="/browse" search={{ q: "" }}>Browse Cars <ArrowRight className="h-4 w-4 ms-2" /></Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  <td className="w-36 pr-4 pb-4" />
                  {cars.map((car) => (
                    <td key={car.id} className="pb-4 pr-4 align-top">
                      <div className="glass-strong rounded-2xl overflow-hidden border border-border/60 relative">
                        <button
                          onClick={() => remove(car.id)}
                          className="absolute top-2 end-2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center z-10 hover:bg-destructive/10 transition-smooth"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="aspect-[16/11] overflow-hidden">
                          {car.image ? (
                            <img src={car.image} alt={car.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-secondary/40 flex items-center justify-center">
                              <Gavel className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-xs text-muted-foreground">{car.brand} · {car.year}</div>
                          <div className="font-display font-semibold text-sm truncate">{car.title}</div>
                          <Link
                            to="/cars/$carId"
                            params={{ carId: car.id }}
                            className="inline-flex items-center gap-1 text-xs text-primary-glow hover:underline mt-1"
                          >
                            View listing <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specs.map((spec) => {
                  const vals = cars.map((c) => spec.get(c));
                  const allSame = vals.every((v) => v === vals[0]);
                  return (
                    <tr key={spec.label} className="border-t border-border/30">
                      <td className="py-3 pr-4 text-xs text-muted-foreground uppercase tracking-wider align-middle">
                        {spec.label}
                      </td>
                      {cars.map((car, i) => {
                        const val = vals[i];
                        const isBest = spec.label === "Price"
                          ? val === [...vals].sort()[0]
                          : spec.label === "Mileage"
                          ? val === [...vals].sort()[0]
                          : spec.label === "Horsepower"
                          ? val === [...vals].sort().reverse()[0]
                          : null;
                        return (
                          <td key={car.id} className={`py-3 pr-4 font-display text-sm font-semibold align-middle ${isBest ? "text-[var(--success)]" : ""} ${val == null || val === "" ? "text-muted-foreground" : ""} ${spec.label === "Accident History" && val === "Yes" ? "text-yellow-400" : ""}`}>
                            <div className="flex items-center gap-1.5">
                              {spec.label === "Accident History" && (
                                val === "No"
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                                  : <CircleX className="h-3.5 w-3.5 text-yellow-400" />
                              )}
                              {val ?? "—"}
                              {!allSame && isBest && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] uppercase font-bold">Best</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t border-border/40">
                  <td className="py-4 pr-4 text-xs text-muted-foreground uppercase tracking-wider">Options</td>
                  {cars.map((car) => (
                    <td key={car.id} className="py-4 pr-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {car.carOptions.slice(0, 5).map((o) => (
                          <span key={o} className="text-[9px] px-1.5 py-0.5 rounded-full glass border border-primary/20 text-primary-glow">{o.replace(/_/g, " ")}</span>
                        ))}
                        {car.carOptions.length > 5 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full glass border border-border/40 text-muted-foreground">+{car.carOptions.length - 5} more</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
