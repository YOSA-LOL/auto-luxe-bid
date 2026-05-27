import { createServerFn } from "@tanstack/react-start";
import { Pool } from "pg";
import type { DbCar } from "./types";

export type { DbCar };

export type CarInput = {
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
  images: string[];
  videos: string[];
  documents: string[];
  dealership: string;
  city: string;
  hp: number | null;
  engine: string | null;
  vin: string | null;
  plate_status: string | null;
  seats: number;
  is_live: boolean;
  current_bid: number | null;
  starting_price: number | null;
  buy_now_price: number | null;
  reserve_price: number | null;
  min_raise: number;
  ends_at: number | null;
  featured: boolean;
  accident_history: boolean;
  paint_condition: string | null;
  tire_condition: string | null;
  battery_health: number | null;
  service_history: string | null;
  description: string | null;
};

export type DbBid = {
  id: number;
  car_id: string;
  user_name: string;
  amount: number;
  created_at: string;
};

function getPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export const getCarsFromDb = createServerFn().handler(async (): Promise<DbCar[]> => {
  const pool = getPool();
  try {
    const { rows } = await pool.query<DbCar & { bids_count: string }>(
      `SELECT c.*, COUNT(b.id)::int AS bids_count
       FROM cars c
       LEFT JOIN bids b ON b.car_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    return rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) }));
  } finally {
    await pool.end();
  }
});

export const getLiveCarsFromDb = createServerFn().handler(async (): Promise<DbCar[]> => {
  const pool = getPool();
  try {
    const { rows } = await pool.query<DbCar & { bids_count: string }>(
      `SELECT c.*, COUNT(b.id)::int AS bids_count
       FROM cars c
       LEFT JOIN bids b ON b.car_id = c.id
       WHERE c.is_live = true
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    return rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) }));
  } finally {
    await pool.end();
  }
});

export const getCarFromDb = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<DbCar | null> => {
    const pool = getPool();
    try {
      const { rows } = await pool.query<DbCar & { bids_count: string }>(
        `SELECT c.*, COUNT(b.id)::int AS bids_count
         FROM cars c
         LEFT JOIN bids b ON b.car_id = c.id
         WHERE c.id = $1
         GROUP BY c.id`,
        [id]
      );
      if (!rows[0]) return null;
      return { ...rows[0], bids_count: Number(rows[0].bids_count) };
    } finally {
      await pool.end();
    }
  });

export const getBidsForCar = createServerFn()
  .inputValidator((carId: string) => carId)
  .handler(async ({ data: carId }): Promise<DbBid[]> => {
    const pool = getPool();
    try {
      const { rows } = await pool.query<DbBid>(
        `SELECT * FROM bids WHERE car_id = $1 ORDER BY amount DESC LIMIT 20`,
        [carId]
      );
      return rows;
    } finally {
      await pool.end();
    }
  });

export const placeBidInDb = createServerFn()
  .inputValidator((input: { carId: string; amount: number; userName: string }) => input)
  .handler(async ({ data }): Promise<DbBid> => {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: carRows } = await client.query<{ current_bid: number | null; min_raise: number | null; is_live: boolean; reserve_price: number | null }>(
        `SELECT current_bid, min_raise, is_live, reserve_price FROM cars WHERE id = $1 FOR UPDATE`,
        [data.carId]
      );
      const car = carRows[0];
      if (!car) throw new Error("Car not found");
      if (!car.is_live) throw new Error("Auction is not live");
      const minBid = (car.current_bid ?? 0) + (car.min_raise ?? 10000);
      if (data.amount < minBid) throw new Error(`Bid must be at least ${minBid}`);
      await client.query(
        `UPDATE cars SET current_bid = $1, viewers = GREATEST(viewers + 1, 1) WHERE id = $2`,
        [data.amount, data.carId]
      );
      const { rows: bidRows } = await client.query<DbBid>(
        `INSERT INTO bids (car_id, user_name, amount) VALUES ($1, $2, $3) RETURNING *`,
        [data.carId, data.userName, data.amount]
      );
      await client.query("COMMIT");
      return bidRows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
  });

export const createCar = createServerFn()
  .inputValidator((input: CarInput) => input)
  .handler(async ({ data }): Promise<DbCar> => {
    const pool = getPool();
    try {
      const { rows } = await pool.query<DbCar>(
        `INSERT INTO cars (
          id, title, brand, model, year, trim, price, currency, mileage, fuel,
          transmission, drivetrain, color, condition, image_url, images, videos, documents,
          dealership, city, hp, engine, vin, plate_status, seats, is_live,
          current_bid, starting_price, buy_now_price, reserve_price, min_raise, ends_at,
          featured, accident_history, paint_condition, tire_condition, battery_health,
          service_history, description
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24,$25,$26,
          $27,$28,$29,$30,$31,$32,
          $33,$34,$35,$36,$37,
          $38,$39
        ) RETURNING *`,
        [
          data.id, data.title, data.brand, data.model, data.year, data.trim,
          data.price, data.currency, data.mileage, data.fuel,
          data.transmission, data.drivetrain, data.color, data.condition,
          data.image_url, data.images, data.videos, data.documents,
          data.dealership, data.city, data.hp, data.engine, data.vin, data.plate_status,
          data.seats, data.is_live,
          data.current_bid, data.starting_price, data.buy_now_price, data.reserve_price,
          data.min_raise, data.ends_at,
          data.featured, data.accident_history, data.paint_condition, data.tire_condition,
          data.battery_health, data.service_history, data.description,
        ]
      );
      return rows[0];
    } finally {
      await pool.end();
    }
  });

export const updateCar = createServerFn()
  .inputValidator((input: Partial<CarInput> & { id: string }) => input)
  .handler(async ({ data }): Promise<DbCar> => {
    const pool = getPool();
    try {
      const { id, ...rest } = data;
      const fields = Object.entries(rest).filter(([, v]) => v !== undefined);
      if (fields.length === 0) throw new Error("Nothing to update");
      const setClauses = fields.map(([k], i) => `${k} = $${i + 2}`).join(", ");
      const values = fields.map(([, v]) => v);
      const { rows } = await pool.query<DbCar>(
        `UPDATE cars SET ${setClauses} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
      if (!rows[0]) throw new Error("Car not found");
      return rows[0];
    } finally {
      await pool.end();
    }
  });

export const deleteCar = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    const pool = getPool();
    try {
      await pool.query(`DELETE FROM cars WHERE id = $1`, [id]);
    } finally {
      await pool.end();
    }
  });
