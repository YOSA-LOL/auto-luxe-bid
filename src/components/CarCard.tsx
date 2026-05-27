import { Link } from "@tanstack/react-router";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import type { AppCar } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Gauge, Fuel, CircleCheck, Radio } from "lucide-react";
import { toast } from "sonner";
import { useFavorites } from "@/lib/favorites";

export function CarCard({ car }: { car: AppCar }) {
  const live = car.isLive;
  const { isFavorited, toggle } = useFavorites();
  const liked = isFavorited(car.id);

  const handleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(car.id);
    toast.success(liked ? "Removed from favorites" : "Added to favorites ♥");
  };

  return (
    <Link
      to="/cars/$carId"
      params={{ carId: car.id }}
      className="group relative block overflow-hidden rounded-xl md:rounded-2xl bg-gradient-card border border-border/60 hover-lift active:scale-[0.98] transition-smooth"
    >
      <div className="relative aspect-[4/3] md:aspect-[16/11] overflow-hidden">
        <img
          src={car.image}
          alt={car.title}
          loading="lazy"
          width={1280}
          height={896}
          className="h-full w-full object-cover transition-smooth group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        <div className="absolute top-2 left-2 flex gap-1.5">
          {live && (
            <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1 text-[10px] px-1.5 py-0.5">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </Badge>
          )}
          {car.verified && (
            <Badge variant="outline" className="glass border-primary/40 text-foreground gap-1 text-[10px] px-1.5 py-0.5">
              <CircleCheck className="h-2.5 w-2.5 text-primary-glow" />
              <span className="hidden sm:inline">Verified</span>
            </Badge>
          )}
        </div>

        <button
          onClick={handleHeart}
          className={`absolute top-2 right-2 h-8 w-8 md:h-9 md:w-9 rounded-full glass flex items-center justify-center transition-smooth ${liked ? "text-red-500" : ""}`}
          aria-label={liked ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-3.5 w-3.5 md:h-4 md:w-4 ${liked ? "fill-current" : ""}`} />
        </button>

        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{car.brand} · {car.year}</div>
          <h3 className="font-display text-sm md:text-lg font-semibold leading-tight line-clamp-1">{car.title}</h3>
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-2 md:space-y-3">
        <div className="flex flex-wrap gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-2.5 w-2.5 md:h-3 md:w-3" />
            {formatNumber(car.mileage)} km
          </span>
          <span className="inline-flex items-center gap-1">
            <Fuel className="h-2.5 w-2.5 md:h-3 md:w-3" />
            {car.fuel}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3" />
            {car.city}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">
              {live ? "Current Bid" : "Buy Now"}
            </div>
            <div className="font-display text-base md:text-xl font-bold text-gradient-primary">
              {formatPrice(live ? car.currentBid! : car.price, car.currency)}
            </div>
          </div>
          {live && (
            <div className="text-right">
              <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Bids</div>
              <div className="font-display text-sm font-semibold">{car.bids}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
