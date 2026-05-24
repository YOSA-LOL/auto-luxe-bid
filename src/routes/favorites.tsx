import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CarCard } from "@/components/CarCard";
import { CARS } from "@/lib/mock-data";
import { useFavorites } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "My Favorites — APEXAuto" },
      { name: "description", content: "Your saved cars on APEXAuto." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, count } = useFavorites();
  const favoritedCars = CARS.filter((c) => favorites.includes(c.id));

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Heart className={`h-5 w-5 ${count > 0 ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-semibold">Saved</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-2">
          My <span className="text-gradient-primary">Favorites</span>
        </h1>
        <p className="text-muted-foreground mb-10">
          {count === 0 ? "You haven't saved any cars yet." : `${count} car${count !== 1 ? "s" : ""} saved`}
        </p>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-3xl glass-strong border border-border/40 text-center gap-5">
            <div className="h-20 w-20 rounded-full glass flex items-center justify-center">
              <Heart className="h-9 w-9 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-2">No favorites yet</h2>
              <p className="text-muted-foreground max-w-sm">
                Browse our listings and tap the heart icon on any car to save it here.
              </p>
            </div>
            <Button asChild className="bg-gradient-primary border-0 text-primary-foreground shadow-glow mt-2">
              <Link to="/browse" search={{ q: "" }}>
                Browse Cars <ArrowRight className="h-4 w-4" />
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
