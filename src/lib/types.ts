import type { DbCar } from "./cars.server";
import { getCarImage } from "./car-images";

export type AppCar = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage: number;
  fuel: string;
  transmission: string;
  color: string;
  condition: string;
  image: string;
  dealership: string;
  city: string;
  verified: boolean;
  hp: number | null;
  engine: string | null;
  vin: string | null;
  seats: number;
  isLive: boolean;
  currentBid: number | null;
  minRaise: number;
  bids: number;
  endsAt: number | null;
  viewers: number;
  description: string | null;
};

export function dbCarToApp(car: DbCar): AppCar {
  return {
    id: car.id,
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    currency: car.currency ?? "EGP",
    mileage: car.mileage,
    fuel: car.fuel,
    transmission: car.transmission,
    color: car.color,
    condition: car.condition,
    image: getCarImage(car.id, car.image_url),
    dealership: car.dealership,
    city: car.city,
    verified: car.verified ?? true,
    hp: car.hp ?? null,
    engine: car.engine ?? null,
    vin: car.vin ?? null,
    seats: car.seats ?? 5,
    isLive: car.is_live ?? false,
    currentBid: car.current_bid ?? null,
    minRaise: car.min_raise ?? 10000,
    bids: car.bids_count ?? 0,
    endsAt: car.ends_at ?? null,
    viewers: car.viewers ?? 0,
    description: car.description ?? null,
  };
}

export function generateCarId(brand: string, model: string, year: number | string): string {
  return `${brand}-${model}-${year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
