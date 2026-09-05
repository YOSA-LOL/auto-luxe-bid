import mysql from "mysql2/promise";

const BRAND_NAME = "Elite Drive";
const now = Date.now();

const cars = [
  {
    id: "mclaren-gt-2022",
    title: "McLaren GT Coupe",
    brand: "McLaren",
    model: "GT",
    year: 2022,
    price: 5200000,
    mileage: 12400,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "Indigo Metallic",
    condition: "Excellent",
    image: "/cars/car-1.jpg",
    dealership: BRAND_NAME,
    city: "Cairo",
    hp: 612,
    engine: "4.0L Twin-Turbo V8",
    vin: "SBM22GCAXNW000123",
    seats: 2,
    is_live: 1,
    is_new: 0,
    featured: 1,
    current_bid: 4850000,
    starting_price: 4500000,
    buy_now_price: 5200000,
    reserve_price: 4700000,
    min_raise: 25000,
    ends_at: now + 1000 * 60 * 18,
    viewers: 187,
    description: "McLaren GT in excellent condition. Full service history, carbon pack, premium audio.",
    car_options: ["Carbon Pack", "Premium Audio", "Ceramic Brakes"],
  },
  {
    id: "range-rover-vogue-2023",
    title: "Range Rover Vogue SE",
    brand: "Land Rover",
    model: "Range Rover Vogue",
    year: 2023,
    price: 6900000,
    mileage: 8200,
    fuel: "Hybrid",
    transmission: "Automatic",
    color: "Fuji White",
    condition: "Excellent",
    image: "/cars/car-2.jpg",
    dealership: BRAND_NAME,
    city: "New Cairo",
    hp: 440,
    engine: "3.0L I6 MHEV",
    vin: "SALGS2RU3PA000456",
    seats: 5,
    is_live: 1,
    is_new: 0,
    featured: 1,
    current_bid: 6240000,
    starting_price: 6000000,
    buy_now_price: 6900000,
    reserve_price: 6100000,
    min_raise: 50000,
    ends_at: now + 1000 * 60 * 42,
    viewers: 224,
    description: "Range Rover Vogue SE with panoramic roof, Meridian sound, and adaptive cruise.",
    car_options: ["Panoramic Roof", "Meridian Sound", "Adaptive Cruise"],
  },
  {
    id: "toyota-supra-2021",
    title: "Toyota GR Supra 3.0",
    brand: "Toyota",
    model: "GR Supra",
    year: 2021,
    price: 2450000,
    mileage: 18900,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "Renaissance Red",
    condition: "Very Good",
    image: "/cars/car-3.jpg",
    dealership: BRAND_NAME,
    city: "Alexandria",
    hp: 382,
    engine: "3.0L Turbo I6",
    vin: "WZ1DB0C03MW000789",
    seats: 2,
    is_live: 1,
    is_new: 0,
    featured: 0,
    current_bid: 2120000,
    starting_price: 2000000,
    buy_now_price: 2450000,
    reserve_price: 2050000,
    min_raise: 15000,
    ends_at: now + 1000 * 60 * 7,
    viewers: 312,
    description: "GR Supra 3.0 with sport exhaust, JBL audio, and clean accident-free history.",
    car_options: ["Sport Exhaust", "JBL Audio", "Heads-Up Display"],
  },
  {
    id: "rolls-royce-dawn-2020",
    title: "Rolls-Royce Dawn Convertible",
    brand: "Rolls-Royce",
    model: "Dawn",
    year: 2020,
    price: 12500000,
    mileage: 22500,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "Silver Sand",
    condition: "Excellent",
    image: "/cars/car-4.jpg",
    dealership: BRAND_NAME,
    city: "Cairo",
    hp: 563,
    engine: "6.6L Twin-Turbo V12",
    vin: "SCA666D58LU000111",
    seats: 4,
    is_live: 0,
    is_new: 0,
    featured: 1,
    description: "Rolls-Royce Dawn convertible. Bespoke interior, starlight headliner, soft-close doors.",
    car_options: ["Starlight Headliner", "Bespoke Interior", "Soft-Close Doors"],
  },
  {
    id: "dodge-challenger-1970",
    title: "Dodge Challenger R/T Classic",
    brand: "Dodge",
    model: "Challenger R/T",
    year: 1970,
    price: 3100000,
    mileage: 64000,
    fuel: "Petrol",
    transmission: "Manual",
    color: "Sublime Green",
    condition: "Very Good",
    image: "/cars/car-5.jpg",
    dealership: BRAND_NAME,
    city: "Giza",
    hp: 425,
    engine: "7.0L V8 HEMI",
    vin: "JS23R0B000222",
    seats: 4,
    is_live: 0,
    is_new: 0,
    featured: 0,
    description: "Classic 1970 Dodge Challenger R/T. Restored HEMI, matching numbers, show quality.",
    car_options: ["Matching Numbers", "Restored HEMI", "Classic Wheels"],
  },
  {
    id: "bugatti-chiron-2022",
    title: "Bugatti Chiron Sport",
    brand: "Bugatti",
    model: "Chiron",
    year: 2022,
    price: 92000000,
    mileage: 1800,
    fuel: "Petrol",
    transmission: "Automatic",
    color: "French Racing Blue",
    condition: "Excellent",
    image: "/cars/car-6.jpg",
    dealership: BRAND_NAME,
    city: "Cairo",
    hp: 1500,
    engine: "8.0L Quad-Turbo W16",
    vin: "VF9SP3V36NM000333",
    seats: 2,
    is_live: 1,
    is_new: 1,
    featured: 1,
    current_bid: 86500000,
    starting_price: 85000000,
    buy_now_price: 92000000,
    reserve_price: 86000000,
    min_raise: 500000,
    ends_at: now + 1000 * 60 * 55,
    viewers: 891,
    description: "Bugatti Chiron Sport. Low mileage, full dealer service, carbon fiber body panels.",
    car_options: ["Carbon Fiber Body", "Sport Package", "Track Mode"],
  },
];

const bids = [
  { car_id: "mclaren-gt-2022", user_name: "A. Hassan", amount: 4850000 },
  { car_id: "mclaren-gt-2022", user_name: "M. Karim", amount: 4825000 },
  { car_id: "range-rover-vogue-2023", user_name: "Y. Saleh", amount: 6240000 },
  { car_id: "toyota-supra-2021", user_name: "R. Adel", amount: 2120000 },
  { car_id: "bugatti-chiron-2022", user_name: "S. Nour", amount: 86500000 },
];

const url = process.env.DATABASE_URL ?? "mysql://root:2305340@127.0.0.1:3306/car_showroom";
const parsed = new URL(url);
const sslMode = (parsed.searchParams.get("ssl-mode") || "").toLowerCase();

const pool = mysql.createPool({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username || "root"),
  password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  database: parsed.pathname.replace(/^\//, "").split("?")[0] || "car_showroom",
  ...(sslMode === "required" ? { ssl: { rejectUnauthorized: false } } : {}),
});

const insertCarSql = `
  INSERT INTO cars (
    id, title, brand, model, year, price, currency, mileage, fuel, transmission,
    color, \`condition\`, is_new, image_url, images, videos, documents,
    dealership, city, verified, hp, engine, vin, seats, is_live,
    current_bid, starting_price, buy_now_price, reserve_price, min_raise, ends_at,
    viewers, featured, accident_history, description, car_options
  ) VALUES (?, ?, ?, ?, ?, ?, 'EGP', ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]',
    ?, ?, 1, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, 0, ?, ?
  )
  ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    image_url = VALUES(image_url),
    images = VALUES(images),
    is_live = VALUES(is_live),
    current_bid = VALUES(current_bid),
    ends_at = VALUES(ends_at),
    featured = VALUES(featured),
    description = VALUES(description)
`;

try {
  for (const car of cars) {
    const images = JSON.stringify([car.image]);
    const options = JSON.stringify(car.car_options ?? []);
    await pool.execute(insertCarSql, [
      car.id,
      car.title,
      car.brand,
      car.model,
      car.year,
      car.price,
      car.mileage,
      car.fuel,
      car.transmission,
      car.color,
      car.condition,
      car.is_new ?? 0,
      car.image,
      images,
      car.dealership,
      car.city,
      car.hp,
      car.engine,
      car.vin,
      car.seats,
      car.is_live ?? 0,
      car.current_bid ?? null,
      car.starting_price ?? null,
      car.buy_now_price ?? null,
      car.reserve_price ?? null,
      car.min_raise ?? 10000,
      car.ends_at ?? null,
      car.viewers ?? 0,
      car.featured ?? 0,
      car.description ?? null,
      options,
    ]);
    console.log(`✓ ${car.title}`);
  }

  for (const bid of bids) {
    await pool.execute(
      `INSERT INTO bids (car_id, user_name, amount) VALUES (?, ?, ?)`,
      [bid.car_id, bid.user_name, bid.amount],
    );
  }
  console.log(`✓ ${bids.length} sample bids`);

  await pool.execute(
    `INSERT INTO site_settings (\`key\`, value) VALUES ('featured_hero_car_id', ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    ["mclaren-gt-2022"],
  );
  console.log("✓ Hero car pinned");

  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM cars");
  console.log(`\nDone — ${n} cars in car_showroom`);
} finally {
  await pool.end();
}
