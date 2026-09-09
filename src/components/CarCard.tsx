import { Link } from "@tanstack/react-router";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import type { AppCar } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Gauge, Fuel, CircleCheck, Radio, Car } from "lucide-react";
import { toast } from "sonner";
import { useFavorites } from "@/lib/favorites";
import { useLanguage } from "@/lib/language";
import { useState } from "react";

export function CarCard({ car }: { car: AppCar }) {
  const live = car.isLive;
  const { isFavorited, toggle } = useFavorites();
  const liked = isFavorited(car.id);
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const handleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(car.id);
    toast.success(liked ? t("card_fav_remove") : t("card_fav_add"));
  };

  const noImage = !car.image || imgError;
  const displayPrice = formatPrice(live ? (car.currentBid ?? car.price) : car.price, car.currency);

  return (
    <Link
      to="/cars/$carId"
      params={{ carId: car.id }}
      className="group relative block overflow-hidden rounded-lg md:rounded-2xl bg-gradient-card border border-border/60 hover-lift cyber-card aether-car-card active:scale-[0.98] transition-smooth shadow-card"
    >
      <div className="card-image-wrap relative aspect-[3/2] md:aspect-[16/11] overflow-hidden">
        {noImage ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-background via-card to-background/80">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Car className="h-8 w-8 text-primary/40" />
            </div>
            <span className="text-xs text-muted-foreground/60 font-medium tracking-wide uppercase">No photo</span>
          </div>
        ) : (
          <img
            src={car.image}
            alt={car.title}
            loading="lazy"
            width={1280}
            height={896}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-smooth group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        <div className="absolute top-2 start-2 flex gap-1.5">
          {live && (
            <Badge className="bg-[var(--live)] text-white border-0 animate-pulse-live gap-1 text-[10px] px-1.5 py-0.5">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </Badge>
          )}
          {car.isNew && (
            <Badge className="bg-green-500/90 text-white border-0 gap-1 text-[10px] px-1.5 py-0.5">
              <span>{t("new_cars_label")}</span>
            </Badge>
          )}
          {car.verified && (
            <Badge variant="outline" className="glass border-primary/40 text-foreground gap-1 text-[10px] px-1.5 py-0.5">
              <CircleCheck className="h-2.5 w-2.5 text-primary-glow" />
              <span className="hidden sm:inline">{t("card_verified")}</span>
            </Badge>
          )}
        </div>

        <div className="absolute top-2 end-2">
          <button
            onClick={handleHeart}
            className={`h-8 w-8 md:h-9 md:w-9 rounded-full glass flex items-center justify-center transition-smooth ${liked ? "text-red-500" : ""}`}
            aria-label={liked ? t("card_fav_remove") : t("card_fav_add")}
          >
            <Heart className={`h-3.5 w-3.5 md:h-4 md:w-4 ${liked ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="absolute bottom-1.5 start-2 end-2">
          <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">{car.brand} · {car.year}</div>
          <h3 className="font-display text-xs md:text-lg font-semibold leading-tight line-clamp-1">{car.title}</h3>
        </div>
      </div>

      <div className="p-2 md:p-4 space-y-1.5 md:space-y-3">
        <div className="flex flex-wrap gap-1.5 md:gap-3 text-label-caps text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Gauge className="h-2 w-2 md:h-3 md:w-3" />
            {formatNumber(car.mileage)} km
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Fuel className="h-2 w-2 md:h-3 md:w-3" />
            {car.fuel}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-2 w-2 md:h-3 md:w-3" />
            {car.city}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">
              {live ? t("card_current_bid") : t("card_buy_now")}
            </div>
            <div className="font-display text-sm md:text-xl font-bold text-primary-glow tabular-nums">
              {displayPrice}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
