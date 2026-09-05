import car1 from "@/assets/car-1.jpg";
import car2 from "@/assets/car-2.jpg";
import car3 from "@/assets/car-3.jpg";
import car4 from "@/assets/car-4.jpg";
import car5 from "@/assets/car-5.jpg";
import car6 from "@/assets/car-6.jpg";

export type Car = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage: number;
  fuel: "Petrol" | "Diesel" | "Electric" | "Hybrid";
  transmission: "Automatic" | "Manual";
  color: string;
  condition: "Excellent" | "Very Good" | "Good";
  image: string;
  city: string;
  verified: boolean;
  hp: number;
  engine: string;
  vin: string;
  seats: number;
  isLive?: boolean;
  currentBid?: number;
  minRaise?: number;
  bids?: number;
  endsAt?: number; // ms timestamp
  viewers?: number;
};

const now = Date.now();

export const CARS: Car[] = [
  {
    id: "mclaren-gt-2022",
    title: "McLaren GT Coupe",
    brand: "McLaren",
    model: "GT",
    year: 2022,
    price: 5_200_000,
    currency: "EGP",
    mileage: 12400,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "Indigo Metallic",
    condition: "Excellent",
    image: car1,
    city: "Cairo",
    verified: true,
    hp: 612,
    engine: "4.0L Twin-Turbo V8",
    vin: "SBM22GCAXNW000123",
    seats: 2,
    isLive: true,
    currentBid: 4_850_000,
    minRaise: 25_000,
    bids: 42,
    endsAt: now + 1000 * 60 * 18,
    viewers: 187,
  },
  {
    id: "range-rover-vogue-2023",
    title: "Range Rover Vogue SE",
    brand: "Land Rover",
    model: "Range Rover Vogue",
    year: 2023,
    price: 6_900_000,
    currency: "EGP",
    mileage: 8200,
    fuel: "Hybrid",
    transmission: "Automatic",
    color: "Fuji White",
    condition: "Excellent",
    image: car2,
    city: "New Cairo",
    verified: true,
    hp: 440,
    engine: "3.0L I6 MHEV",
    vin: "SALGS2RU3PA000456",
    seats: 5,
    isLive: true,
    currentBid: 6_240_000,
    minRaise: 50_000,
    bids: 31,
    endsAt: now + 1000 * 60 * 42,
    viewers: 224,
  },
  {
    id: "toyota-supra-2021",
    title: "Toyota GR Supra 3.0",
    brand: "Toyota",
    model: "GR Supra",
    year: 2021,
    price: 2_450_000,
    currency: "EGP",
    mileage: 18900,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "Renaissance Red",
    condition: "Very Good",
    image: car3,
    city: "Alexandria",
    verified: true,
    hp: 382,
    engine: "3.0L Turbo I6",
    vin: "WZ1DB0C03MW000789",
    seats: 2,
    isLive: true,
    currentBid: 2_120_000,
    minRaise: 15_000,
    bids: 58,
    endsAt: now + 1000 * 60 * 7,
    viewers: 312,
  },
  {
    id: "rolls-royce-dawn-2020",
    title: "Rolls-Royce Dawn Convertible",
    brand: "Rolls-Royce",
    model: "Dawn",
    year: 2020,
    price: 12_500_000,
    currency: "EGP",
    mileage: 22500,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "Silver Sand",
    condition: "Excellent",
    image: car4,
    city: "Cairo",
    verified: true,
    hp: 563,
    engine: "6.6L Twin-Turbo V12",
    vin: "SCA666D58LU000111",
    seats: 4,
    isLive: false,
  },
  {
    id: "dodge-challenger-1970",
    title: "Dodge Challenger R/T Classic",
    brand: "Dodge",
    model: "Challenger R/T",
    year: 1970,
    price: 3_100_000,
    currency: "EGP",
    mileage: 64000,
    fuel: "Petrol",
    transmission: "Manual",
    color: "Sublime Green",
    condition: "Very Good",
    image: car5,
    city: "Giza",
    verified: true,
    hp: 425,
    engine: "7.0L V8 HEMI",
    vin: "JS23R0B000222",
    seats: 4,
    isLive: false,
  },
  {
    id: "bugatti-chiron-2022",
    title: "Bugatti Chiron Sport",
    brand: "Bugatti",
    model: "Chiron",
    year: 2022,
    price: 92_000_000,
    currency: "EGP",
    mileage: 1800,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "French Racing Blue",
    condition: "Excellent",
    image: car6,
    city: "Cairo",
    verified: true,
    hp: 1500,
    engine: "8.0L Quad-Turbo W16",
    vin: "VF9SP3V36NM000333",
    seats: 2,
    isLive: true,
    currentBid: 86_500_000,
    minRaise: 500_000,
    bids: 19,
    endsAt: now + 1000 * 60 * 55,
    viewers: 891,
  },
];

export const getCar = (id: string) => CARS.find((c) => c.id === id);
export const liveAuctions = () => CARS.filter((c) => c.isLive);

export const formatPrice = (n: number, currency = "EGP") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);

export const BRANDS = [
  "All Brands",
  "McLaren",
  "Land Rover",
  "Toyota",
  "Rolls-Royce",
  "Dodge",
  "Bugatti",
  "BMW",
  "Mercedes-Benz",
  "Porsche",
];

export const CITIES = ["All Cities", "Cairo", "New Cairo", "Alexandria", "Giza"];

export type BidEntry = { user: string; amount: number; at: number };
export const seedBids = (current: number, raise: number): BidEntry[] => {
  const users = ["A. Hassan", "M. Karim", "Y. Saleh", "R. Adel", "S. Nour", "O. Fathy"];
  let amt = current;
  const out: BidEntry[] = [];
  for (let i = 0; i < 6; i++) {
    out.push({ user: users[i], amount: amt, at: Date.now() - i * 45_000 });
    amt -= raise;
  }
  return out;
};
