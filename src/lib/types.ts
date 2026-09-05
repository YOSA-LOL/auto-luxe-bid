export type AuctionStatus = "none" | "live" | "ended" | "ended_with_winner" | "no_sale" | "sold";

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
  isNew: boolean;
  image: string;
  images: string[];
  videos: string[];
  documents: string[];
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
  engineCondition?: string;
  transmissionCondition?: string;
  suspensionCondition?: string;
  batteryCondition?: string;
  chassisCondition?: string;
  interiorCondition?: string;
  previousOwners?: number;
  licenseExpiry?: string;
  carOptions: string[];
  conditionNotes: Record<string, string>;
  isSold?: boolean;
  soldAt?: string | null;
  isVisible?: boolean;
  auctionStatus?: AuctionStatus;
  winnerEmail?: string | null;
  winnerName?: string | null;
  winningBidId?: number | null;
  endedAt?: string | null;
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
  is_new: boolean | null;
  image_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  documents: string[] | null;
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
  engine_condition: string | null;
  transmission_condition: string | null;
  suspension_condition: string | null;
  battery_condition: string | null;
  chassis_condition: string | null;
  interior_condition: string | null;
  previous_owners: number | null;
  license_expiry: string | null;
  car_options: string[] | null;
  condition_notes: string | null;
  bids_count?: number;
  is_sold?: boolean | null;
  sold_at?: string | null;
  is_visible?: boolean | null;
  auction_status?: AuctionStatus | null;
  winner_email?: string | null;
  winner_name?: string | null;
  winning_bid_id?: number | null;
  ended_at?: string | null;
};

export function dbCarToApp(car: DbCar): AppCar {
  let conditionNotes: Record<string, string> = {};
  if (car.condition_notes) {
    try { conditionNotes = JSON.parse(car.condition_notes); } catch { conditionNotes = {}; }
  }
  const n = (v: unknown): number => Number(v);
  const nOpt = (v: unknown): number | undefined => (v != null ? Number(v) : undefined);
  return {
    id: car.id,
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: n(car.year),
    trim: car.trim ?? undefined,
    price: n(car.price),
    currency: car.currency,
    mileage: n(car.mileage),
    fuel: car.fuel,
    transmission: car.transmission,
    drivetrain: car.drivetrain ?? undefined,
    color: car.color,
    condition: car.condition,
    isNew: car.is_new ?? false,
    image: car.image_url ?? "",
    images: car.images ?? [],
    videos: car.videos ?? [],
    documents: car.documents ?? [],
    city: car.city,
    verified: car.verified,
    hp: nOpt(car.hp),
    engine: car.engine ?? undefined,
    vin: car.vin ?? undefined,
    plateStatus: car.plate_status ?? undefined,
    seats: n(car.seats ?? 5),
    isLive: car.is_live ?? false,
    currentBid: nOpt(car.current_bid),
    startingPrice: nOpt(car.starting_price),
    buyNowPrice: nOpt(car.buy_now_price),
    reservePrice: nOpt(car.reserve_price),
    minRaise: n(car.min_raise ?? 10000),
    endsAt: nOpt(car.ends_at),
    viewers: n(car.viewers ?? 0),
    bids: n(car.bids_count ?? 0),
    featured: car.featured ?? false,
    accidentHistory: car.accident_history ?? false,
    paintCondition: car.paint_condition ?? undefined,
    tireCondition: car.tire_condition ?? undefined,
    batteryHealth: nOpt(car.battery_health),
    serviceHistory: car.service_history ?? undefined,
    description: car.description ?? undefined,
    engineCondition: car.engine_condition ?? undefined,
    transmissionCondition: car.transmission_condition ?? undefined,
    suspensionCondition: car.suspension_condition ?? undefined,
    batteryCondition: car.battery_condition ?? undefined,
    chassisCondition: car.chassis_condition ?? undefined,
    interiorCondition: car.interior_condition ?? undefined,
    previousOwners: nOpt(car.previous_owners),
    licenseExpiry: car.license_expiry ?? undefined,
    carOptions: car.car_options ?? [],
    conditionNotes,
    isSold: car.is_sold ?? false,
    soldAt: car.sold_at ?? null,
    isVisible: car.is_visible !== false,
    auctionStatus: (car.auction_status as AuctionStatus) ?? "none",
    winnerEmail: car.winner_email ?? null,
    winnerName: car.winner_name ?? null,
    winningBidId: car.winning_bid_id ?? null,
    endedAt: car.ended_at ?? null,
  };
}

export function generateCarId(brand: string, model: string, year: number): string {
  const slug = `${brand}-${model}-${year}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-${Date.now().toString(36)}`;
}
