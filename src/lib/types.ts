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
  hp?: number;
  engine?: string;
  vin?: string;
  seats: number;
  isLive: boolean;
  currentBid?: number;
  minRaise: number;
  endsAt?: number;
  viewers: number;
  bids?: number;
  description?: string;
};

export type DbCar = {
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
  image_url: string | null;
  dealership: string;
  city: string;
  verified: boolean;
  hp: number | null;
  engine: string | null;
  vin: string | null;
  seats: number | null;
  is_live: boolean | null;
  current_bid: number | null;
  min_raise: number | null;
  ends_at: number | null;
  viewers: number | null;
  description: string | null;
  bids_count?: number;
};

export function dbCarToApp(car: DbCar): AppCar {
  return {
    id: car.id,
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    currency: car.currency,
    mileage: car.mileage,
    fuel: car.fuel,
    transmission: car.transmission,
    color: car.color,
    condition: car.condition,
    image: car.image_url ?? "",
    dealership: car.dealership,
    city: car.city,
    verified: car.verified,
    hp: car.hp ?? undefined,
    engine: car.engine ?? undefined,
    vin: car.vin ?? undefined,
    seats: car.seats ?? 5,
    isLive: car.is_live ?? false,
    currentBid: car.current_bid ?? undefined,
    minRaise: car.min_raise ?? 10000,
    endsAt: car.ends_at ?? undefined,
    viewers: car.viewers ?? 0,
    bids: car.bids_count ?? 0,
    description: car.description ?? undefined,
  };
}

export function generateCarId(brand: string, model: string, year: number): string {
  const slug = `${brand}-${model}-${year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-${Date.now().toString(36)}`;
}
