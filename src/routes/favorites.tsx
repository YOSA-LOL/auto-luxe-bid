import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { getCarsFromDb } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language";

import { brandPageTitle, BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: brandPageTitle("My Favorites") },
      { name: "description", content: `Your saved cars on ${BRAND_NAME}.` },
    ],
  }),
  loader: async () => {
    const cars = await getCarsFromDb();
    return { cars: cars.map(dbCarToApp) };
  },
  component: FavoritesPage,
});

function FavoritesPage() {
  const { cars } = Route.useLoaderData();
  const { isFavorited, count } = useFavorites();
  const favoritedCars = cars.filter((c) => isFavorited(c.id));
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-nav">
      <Header />
      <div className="page-content max-w-7xl">
        <div className="flex items-center gap-3 mb-2">
          <Heart className={`h-5 w-5 ${count > 0 ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Saved</span>
        </div>
        <h1 className="page-title mb-2">
          {t("fav_title")}
        </h1>
        <p className="text-muted-foreground mb-6 sm:mb-10 page-subtitle">
          {count === 0 ? t("fav_empty_p") : t("browse_results", { n: count })}
        </p>

        {favoritedCars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-3xl glass-strong border border-border/40 text-center gap-5">
            <div className="h-20 w-20 rounded-full glass flex items-center justify-center">
              <Heart className="h-9 w-9 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-2">{t("fav_empty")}</h2>
              <p className="text-muted-foreground max-w-sm">{t("fav_empty_p")}</p>
            </div>
            <Button asChild className="bg-gradient-primary border-0 text-primary-foreground shadow-glow mt-2">
              <Link to="/browse" search={{ q: "" }}>
                {t("fav_browse")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoritedCars.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
