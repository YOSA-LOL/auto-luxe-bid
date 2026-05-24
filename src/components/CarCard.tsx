import { Link } from "@tanstack/react-router";
import { Car, formatPrice, formatNumber } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Gauge, Fuel, CircleCheck, Radio } from "lucide-react";
import { toast } from "sonner";
import { useFavorites } from "@/lib/favorites";

export function CarCard({ car }: { car: Car }) {
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
      className="group relative block overflow-hidden rounded-2xl bg-gradient-card border border-border/60 hover-lift"
    >
      <div className="relative aspect-[16/11] overflow-hidden">
        <img
          src={car.image}
          alt={car.title}
          loading="lazy"
          width={1280}
          height={896}
          className="h-full w-full object-cover transition-smooth group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2">
          {live && (
            <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1">
              <Radio className="h-3 w-3" /> LIVE
            </Badge>
          )}
          {car.verified && (
            <Badge variant="outline" className="glass border-primary/40 text-foreground gap-1">
              <CircleCheck className="h-3 w-3 text-primary-glow" /> Verified
            </Badge>
          )}
        </div>

        <button
          onClick={handleHeart}
          className={`absolute top-3 right-3 h-9 w-9 rounded-full glass flex items-center justify-center hover:bg-secondary transition-smooth ${liked ? "text-red-500" : ""}`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
        </button>

        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{car.brand} · {car.year}</div>
          <h3 className="font-display text-lg font-semibold leading-tight">{car.title}</h3>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" />{formatNumber(car.mileage)} km</span>
          <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3" />{car.fuel}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{car.city}</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {live ? "Current Bid" : "Buy Now"}
            </div>
            <div className="font-display text-xl font-bold text-gradient-primary">
              {formatPrice(live ? car.currentBid! : car.price, car.currency)}
            </div>
          </div>
          {live && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Bids</div>
              <div className="font-display font-semibold">{car.bids}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
