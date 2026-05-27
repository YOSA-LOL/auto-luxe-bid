export type AppCar = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  trim?: string;
  price: number;
  currency: string;
  mileage: number;
  fuel: string;
  transmission: string;
  drivetrain?: string;
  color: string;
  condition: string;
  image: string;
  images: string[];
  videos: string[];
  documents: string[];
  dealership: string;
  city: string;
  verified: boolean;
  hp?: number;
  engine?: string;
  vin?: string;
  plateStatus?: string;
  seats: number;
  isLive: boolean;
  currentBid?: number;
  startingPrice?: number;
  buyNowPrice?: number;
  reservePrice?: number;
  minRaise: number;
  endsAt?: number;
  viewers: number;
  bids?: number;
  featured: boolean;
  accidentHistory: boolean;
  paintCondition?: string;
  tireCondition?: string;
  batteryHealth?: number;
  serviceHistory?: string;
  description?: string;
};

export type DbCar = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  trim: string | null;
  price: number;
  currency: string;
  mileage: number;
  fuel: string;
  transmission: string;
  drivetrain: string | null;
  color: string;
  condition: string;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  documents: string[] | null;
  dealership: string;
  city: string;
  verified: boolean;
  hp: number | null;
  engine: string | null;
  vin: string | null;
  plate_status: string | null;
  seats: number | null;
  is_live: boolean | null;
  current_bid: number | null;
  starting_price: number | null;
  buy_now_price: number | null;
  reserve_price: number | null;
  min_raise: number | null;
  ends_at: number | null;
  viewers: number | null;
  featured: boolean | null;
  accident_history: boolean | null;
  paint_condition: string | null;
  tire_condition: string | null;
  battery_health: number | null;
  service_history: string | null;
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
    trim: car.trim ?? undefined,
    price: car.price,
    currency: car.currency,
    mileage: car.mileage,
    fuel: car.fuel,
    transmission: car.transmission,
    drivetrain: car.drivetrain ?? undefined,
    color: car.color,
    condition: car.condition,
    image: car.image_url ?? "",
    images: car.images ?? [],
    videos: car.videos ?? [],
    documents: car.documents ?? [],
    dealership: car.dealership,
    city: car.city,
    verified: car.verified,
    hp: car.hp ?? undefined,
    engine: car.engine ?? undefined,
    vin: car.vin ?? undefined,
    plateStatus: car.plate_status ?? undefined,
    seats: car.seats ?? 5,
    isLive: car.is_live ?? false,
    currentBid: car.current_bid ?? undefined,
    startingPrice: car.starting_price ?? undefined,
    buyNowPrice: car.buy_now_price ?? undefined,
    reservePrice: car.reserve_price ?? undefined,
    minRaise: car.min_raise ?? 10000,
    endsAt: car.ends_at ?? undefined,
    viewers: car.viewers ?? 0,
    bids: car.bids_count ?? 0,
    featured: car.featured ?? false,
    accidentHistory: car.accident_history ?? false,
    paintCondition: car.paint_condition ?? undefined,
    tireCondition: car.tire_condition ?? undefined,
    batteryHealth: car.battery_health ?? undefined,
    serviceHistory: car.service_history ?? undefined,
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
