import { createServerFn } from "@tanstack/react-start";
import { query } from "./db.server";

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
  seats: number;
  is_live: boolean;
  current_bid: number | null;
  min_raise: number;
  bids_count: number;
  ends_at: number | null;
  viewers: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type DbBid = {
  id: number;
  car_id: string;
  user_name: string;
  user_id: string | null;
  amount: number;
  created_at: string;
};

export const getCarsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await query<DbCar>("SELECT * FROM cars ORDER BY created_at DESC");
});

export const getLiveCarsFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await query<DbCar>("SELECT * FROM cars WHERE is_live = true ORDER BY ends_at ASC");
});

export const getCarFromDb = createServerFn({ method: "GET" }).handler(
  async (ctx: { data: string }) => {
    const rows = await query<DbCar>("SELECT * FROM cars WHERE id = $1", [ctx.data]);
    return rows[0] ?? null;
  }
);

export const getBidsForCar = createServerFn({ method: "GET" }).handler(
  async (ctx: { data: string }) => {
    return await query<DbBid>(
      "SELECT * FROM bids WHERE car_id = $1 ORDER BY amount DESC LIMIT 20",
      [ctx.data]
    );
  }
);

export type CarInput = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency?: string;
  mileage: number;
  fuel: string;
  transmission: string;
  color: string;
  condition: string;
  image_url?: string | null;
  dealership: string;
  city: string;
  hp?: number | null;
  engine?: string | null;
  vin?: string | null;
  seats?: number;
  is_live?: boolean;
  current_bid?: number | null;
  min_raise?: number;
  ends_at?: number | null;
  description?: string | null;
};

export const createCar = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: CarInput }) => {
    const d = ctx.data;
    await query(
      `INSERT INTO cars (id,title,brand,model,year,price,currency,mileage,fuel,transmission,
        color,condition,image_url,dealership,city,hp,engine,vin,seats,is_live,current_bid,
        min_raise,ends_at,description,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id, d.title, d.brand, d.model, d.year, d.price,
        d.currency ?? "EGP", d.mileage, d.fuel, d.transmission,
        d.color, d.condition, d.image_url ?? null, d.dealership,
        d.city, d.hp ?? null, d.engine ?? null, d.vin ?? null,
        d.seats ?? 5, d.is_live ?? false, d.current_bid ?? null,
        d.min_raise ?? 10000, d.ends_at ?? null, d.description ?? null,
      ]
    );
    const rows = await query<DbCar>("SELECT * FROM cars WHERE id = $1", [d.id]);
    return rows[0];
  }
);

export type CarUpdateInput = Partial<CarInput> & { id: string };

export const updateCar = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: CarUpdateInput }) => {
    const { id, ...fields } = ctx.data;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) {
        sets.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }
    if (sets.length === 0) throw new Error("Nothing to update");
    sets.push(`updated_at = NOW()`);
    params.push(id);
    await query(`UPDATE cars SET ${sets.join(", ")} WHERE id = $${idx}`, params);
    const rows = await query<DbCar>("SELECT * FROM cars WHERE id = $1", [id]);
    return rows[0];
  }
);

export const deleteCar = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: string }) => {
    await query("DELETE FROM bids WHERE car_id = $1", [ctx.data]);
    await query("DELETE FROM cars WHERE id = $1", [ctx.data]);
    return { ok: true };
  }
);

export type PlaceBidInput = { carId: string; amount: number; userName: string };

export const placeBidInDb = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: PlaceBidInput }) => {
    const { carId, amount, userName } = ctx.data;
    const cars = await query<DbCar>("SELECT * FROM cars WHERE id = $1", [carId]);
    const car = cars[0];
    if (!car) throw new Error("Car not found");
    if (!car.is_live) throw new Error("Auction is not live");
    const minNext = (car.current_bid ?? 0) + car.min_raise;
    if (amount < minNext) throw new Error(`Minimum bid is EGP ${minNext.toLocaleString()}`);

    await query(
      "INSERT INTO bids (car_id, user_name, amount) VALUES ($1, $2, $3)",
      [carId, userName, amount]
    );
    await query(
      "UPDATE cars SET current_bid = $1, bids_count = bids_count + 1, updated_at = NOW() WHERE id = $2",
      [amount, carId]
    );
    const rows = await query<DbCar>("SELECT * FROM cars WHERE id = $1", [carId]);
    return rows[0];
  }
);
