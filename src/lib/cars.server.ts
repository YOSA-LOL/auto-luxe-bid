import { createServerFn } from "@tanstack/react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { getDb } from "./db.server";
import type { DbCar, AuctionStatus } from "./types";
import { BRAND_NAME } from "./brand";
import { CLERK_SECRET_KEY } from "./clerk-config.server";
import { hasPaidDeposit, markLosersRefundPending } from "./deposits.server";
import { emitUserNotification } from "./user-notifications.server";

export type { DbCar };

/** Public listings — exclude sold and hidden cars */
const PUBLIC_CAR_FILTER = `c.is_sold = 0 AND COALESCE(c.is_visible, 1) = 1`;

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
  is_new: boolean;
  image_url: string | null;
  images: string[];
  videos: string[];
  documents: string[];
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
  engine_condition: string | null;
  transmission_condition: string | null;
  suspension_condition: string | null;
  battery_condition: string | null;
  chassis_condition: string | null;
  interior_condition: string | null;
  previous_owners: number | null;
  license_expiry: string | null;
  car_options: string[];
  condition_notes: string | null;
  is_visible?: boolean;
  auction_status?: AuctionStatus;
};

async function requireBidderAuth(): Promise<{ email: string; name: string }> {
  if (!CLERK_SECRET_KEY) throw new Error("Sign in required to bid");
  const { userId } = await auth();
  if (!userId) throw new Error("Sign in required to bid");
  const client = clerkClient({ secretKey: CLERK_SECRET_KEY });
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Email required to bid");
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Bidder";
  return { email, name };
}

type TopBid = {
  id: number;
  user_name: string;
  user_email: string | null;
  amount: number;
};

async function resolveAuctionWinner(carId: string): Promise<{
  status: AuctionStatus;
  winnerEmail: string | null;
  winnerName: string | null;
  winningBidId: number | null;
}> {
  const db = getDb();
  const { rows: carRows } = await db.query<{
    current_bid: number | null;
    reserve_price: number | null;
  }>(`SELECT current_bid, reserve_price FROM cars WHERE id = $1`, [carId]);
  const car = carRows[0];
  if (!car) return { status: "no_sale", winnerEmail: null, winnerName: null, winningBidId: null };

  const { rows: bidRows } = await db.query<TopBid>(
    `SELECT id, user_name, user_email, amount FROM bids WHERE car_id = $1 ORDER BY amount DESC, created_at ASC LIMIT 1`,
    [carId],
  );
  const top = bidRows[0];
  if (!top) return { status: "no_sale", winnerEmail: null, winnerName: null, winningBidId: null };

  const currentBid = Number(car.current_bid ?? top.amount);
  const reserveMet = car.reserve_price == null || currentBid >= Number(car.reserve_price);
  if (!reserveMet) return { status: "no_sale", winnerEmail: null, winnerName: null, winningBidId: null };

  return {
    status: "ended_with_winner",
    winnerEmail: top.user_email,
    winnerName: top.user_name,
    winningBidId: top.id,
  };
}

export type DbBid = {
  id: number;
  car_id: string;
  user_name: string;
  user_email: string | null;
  amount: number;
  created_at: string;
};

export const getCarsFromDb = createServerFn().handler(async (): Promise<DbCar[]> => {
  const db = getDb();
  const { rows } = await db.query<DbCar & { bids_count: number }>(
    `SELECT c.*, COUNT(b.id) AS bids_count
     FROM cars c
     LEFT JOIN bids b ON b.car_id = c.id
     WHERE ${PUBLIC_CAR_FILTER}
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );
  return rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) }));
});

export const getLiveCarsFromDb = createServerFn().handler(async (): Promise<DbCar[]> => {
  const db = getDb();
  const { rows } = await db.query<DbCar & { bids_count: number }>(
    `SELECT c.*, COUNT(b.id) AS bids_count
     FROM cars c
     LEFT JOIN bids b ON b.car_id = c.id
     WHERE c.is_live = 1 AND ${PUBLIC_CAR_FILTER}
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );
  return rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) }));
});

export const getCarFromDb = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<DbCar | null> => {
    const db = getDb();
    const { rows } = await db.query<DbCar & { bids_count: number }>(
      `SELECT c.*, COUNT(b.id) AS bids_count
       FROM cars c
       LEFT JOIN bids b ON b.car_id = c.id
       WHERE c.id = $1 AND COALESCE(c.is_visible, 1) = 1
       GROUP BY c.id`,
      [id]
    );
    if (!rows[0]) return null;
    return { ...rows[0], bids_count: Number(rows[0].bids_count) };
  });

export const getBidsForCar = createServerFn()
  .inputValidator((carId: string) => carId)
  .handler(async ({ data: carId }): Promise<DbBid[]> => {
    const db = getDb();
    const { rows } = await db.query<DbBid>(
      `SELECT * FROM bids WHERE car_id = $1 ORDER BY amount DESC LIMIT 20`,
      [carId]
    );
    return rows;
  });

export const placeBidInDb = createServerFn()
  .inputValidator((input: { carId: string; amount: number }) => input)
  .handler(async ({ data }): Promise<DbBid> => {
    const bidder = await requireBidderAuth();
    const db = getDb();
    const paid = await hasPaidDeposit(db, bidder.email, data.carId);
    if (!paid) throw new Error("Deposit required before bidding");

    const client = await db.connect();
    try {
      await client.beginTransaction();

      const { rows: carRows } = await client.query<{
        current_bid: number | null;
        min_raise: number | null;
        is_live: boolean;
        is_sold: boolean;
        reserve_price: number | null;
        ends_at: number | null;
        title: string;
      }>(
        `SELECT current_bid, min_raise, is_live, is_sold, reserve_price, ends_at, title
         FROM cars WHERE id = $1 FOR UPDATE`,
        [data.carId]
      );
      const car = carRows[0];
      if (!car) throw new Error("Car not found");
      if (car.is_sold) throw new Error("This car has been sold");
      if (!car.is_live) throw new Error("Auction is not live");
      const minBid = (car.current_bid ?? 0) + (car.min_raise ?? 10000);
      if (data.amount < minBid) throw new Error(`Bid must be at least ${minBid}`);

      const previousBid = car.current_bid;
      const now = Date.now();
      let newEndsAt = car.ends_at;
      if (car.ends_at && car.ends_at - now < 60000 && car.ends_at > now) {
        newEndsAt = now + 120000;
      }

      if (newEndsAt !== car.ends_at) {
        await client.query(
          `UPDATE cars SET current_bid = $1, ends_at = $2, viewers = GREATEST(viewers + 1, 1) WHERE id = $3`,
          [data.amount, newEndsAt, data.carId]
        );
      } else {
        await client.query(
          `UPDATE cars SET current_bid = $1, viewers = GREATEST(viewers + 1, 1) WHERE id = $2`,
          [data.amount, data.carId]
        );
      }

      await client.query(
        `INSERT INTO bids (car_id, user_name, user_email, amount) VALUES ($1, $2, $3, $4)`,
        [data.carId, bidder.name, bidder.email, data.amount]
      );
      const newBidId = await client.lastInsertId();

      const { rows: proxyRows } = await client.query<{ user_name: string; max_amount: number }>(
        `SELECT user_name, max_amount FROM proxy_bids
         WHERE car_id = $1 AND user_name != $2 AND max_amount > $3
         ORDER BY max_amount DESC LIMIT 1`,
        [data.carId, bidder.name, data.amount]
      );
      if (proxyRows[0]) {
        const proxy = proxyRows[0];
        const proxyBidAmount = Math.min(proxy.max_amount, data.amount + (car.min_raise ?? 10000));
        await client.query(`UPDATE cars SET current_bid = $1 WHERE id = $2`, [proxyBidAmount, data.carId]);
        await client.query(
          `INSERT INTO bids (car_id, user_name, user_email, amount) VALUES ($1, $2, $3, $4)`,
          [data.carId, proxy.user_name, null, proxyBidAmount]
        );
      }

      await client.commit();

      if (previousBid && previousBid < data.amount) {
        const { rows: outbidRows } = await db.query<{ user_email: string | null }>(
          `SELECT user_email FROM bids WHERE car_id = $1 AND amount = $2 AND user_email IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
          [data.carId, previousBid],
        );
        const outbidEmail = outbidRows[0]?.user_email;
        if (outbidEmail && outbidEmail !== bidder.email) {
          await emitUserNotification(outbidEmail, "outbid", "You were outbid", `New bid on ${car.title}`, data.carId);
        }
      }

      const { rows: bidRows } = await getDb().query<DbBid>(`SELECT * FROM bids WHERE id = $1`, [newBidId]);
      return bidRows[0];
    } catch (err) {
      await client.rollback();
      throw err;
    } finally {
      client.release();
    }
  });

export const createCar = createServerFn()
  .inputValidator((input: CarInput) => input)
  .handler(async ({ data }): Promise<DbCar> => {
    const db = getDb();
    // MySQL doesn't support RETURNING — INSERT then SELECT
    await db.query(
      `INSERT INTO cars (
        id, title, brand, model, year, trim, price, currency, mileage, fuel,
        transmission, drivetrain, color, \`condition\`, is_new, image_url, images, videos, documents,
        dealership, city, hp, engine, vin, plate_status, seats, is_live,
        current_bid, starting_price, buy_now_price, reserve_price, min_raise, ends_at,
        featured, accident_history, paint_condition, tire_condition, battery_health,
        service_history, description,
        engine_condition, transmission_condition, suspension_condition, battery_condition,
        chassis_condition, interior_condition, previous_owners, license_expiry, car_options,
        condition_notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,
        $28,$29,$30,$31,$32,$33,
        $34,$35,$36,$37,$38,
        $39,$40,
        $41,$42,$43,$44,
        $45,$46,$47,$48,$49,
        $50
      )`,
      [
        data.id, data.title, data.brand, data.model, data.year, data.trim,
        data.price, data.currency, data.mileage, data.fuel,
        data.transmission, data.drivetrain, data.color, data.condition, data.is_new ? 1 : 0,
        data.image_url, data.images, data.videos, data.documents,
        BRAND_NAME, data.city, data.hp, data.engine, data.vin, data.plate_status,
        data.seats, data.is_live ? 1 : 0,
        data.current_bid, data.starting_price, data.buy_now_price, data.reserve_price,
        data.min_raise, data.ends_at,
        data.featured ? 1 : 0, data.accident_history ? 1 : 0,
        data.paint_condition, data.tire_condition,
        data.battery_health, data.service_history, data.description,
        data.engine_condition, data.transmission_condition, data.suspension_condition, data.battery_condition,
        data.chassis_condition, data.interior_condition, data.previous_owners, data.license_expiry, data.car_options,
        data.condition_notes,
      ]
    );
    const { rows } = await db.query<DbCar>(`SELECT * FROM cars WHERE id = $1`, [data.id]);
    return rows[0];
  });

export const updateCar = createServerFn()
  .inputValidator((input: Partial<CarInput> & { id: string }) => input)
  .handler(async ({ data }): Promise<DbCar> => {
    const db = getDb();
    const { id, ...rest } = data;
    const entries = Object.entries(rest).filter(([, v]) => v !== undefined);
    if (entries.length === 0) throw new Error("Nothing to update");

    // Serialize arrays, convert booleans
    const boolFields = new Set(["is_new", "is_live", "featured", "accident_history", "is_sold", "is_visible"]);
    const arrayFields = new Set(["images", "videos", "documents", "car_options"]);

    if (rest.is_live === true) {
      (rest as Record<string, unknown>).auction_status = "live";
    } else if (rest.is_live === false) {
      const { rows: cur } = await db.query<{ auction_status: string }>(
        `SELECT auction_status FROM cars WHERE id = $1`,
        [id],
      );
      if (cur[0]?.auction_status === "live") {
        (rest as Record<string, unknown>).auction_status = "none";
      }
    }

    const setClauses = entries.map(([k]) => {
      const col = k === "condition" ? "`condition`" : k;
      return `${col} = ?`;
    }).join(", ");
    const values = entries.map(([k, v]) => {
      if (boolFields.has(k)) return v ? 1 : 0;
      if (arrayFields.has(k)) return JSON.stringify(v);
      return v;
    });

    await db.query(
      `UPDATE cars SET ${setClauses} WHERE id = ?`,
      [...values, id]
    );
    const { rows } = await db.query<DbCar>(`SELECT * FROM cars WHERE id = ?`, [id]);
    if (!rows[0]) throw new Error("Car not found");
    return rows[0];
  });

export const deleteCar = createServerFn()
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    const db = getDb();
    await db.query(`DELETE FROM cars WHERE id = $1`, [id]);
  });

export const markCarAsSold = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; salePrice?: number }) => input)
  .handler(async ({ data }): Promise<DbCar> => {
    const db = getDb();
    await db.query(
      `UPDATE cars SET is_sold = 1, is_live = 0, is_visible = 1, sold_at = NOW(),
       auction_status = 'sold',
       current_bid = COALESCE($1, current_bid, price) WHERE id = $2`,
      [data.salePrice ?? null, data.id],
    );
    const { rows: carRows } = await db.query<{ winner_email: string | null }>(
      `SELECT winner_email FROM cars WHERE id = $1`,
      [data.id],
    );
    await markLosersRefundPending(db, data.id, carRows[0]?.winner_email ?? null);
    const { rows } = await db.query<DbCar>(`SELECT * FROM cars WHERE id = $1`, [data.id]);
    if (!rows[0]) throw new Error("Car not found");
    return rows[0];
  });

export const markCarAsUnsold = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status?: AuctionStatus }) => input)
  .handler(async ({ data }): Promise<DbCar> => {
    const db = getDb();
    const status = data.status ?? "no_sale";
    await db.query(
      `UPDATE cars SET is_sold = 0, sold_at = NULL, is_live = 0,
       auction_status = $2,
       winner_email = NULL, winner_name = NULL, winning_bid_id = NULL, ended_at = NULL
       WHERE id = $1`,
      [data.id, status],
    );
    const { rows } = await db.query<DbCar>(`SELECT * FROM cars WHERE id = $1`, [data.id]);
    if (!rows[0]) throw new Error("Car not found");
    return rows[0];
  });

async function finalizeExpiredCar(carId: string): Promise<void> {
  const db = getDb();
  const result = await resolveAuctionWinner(carId);
  await db.query(
    `UPDATE cars SET is_live = 0, ended_at = NOW(),
     auction_status = $2, winner_email = $3, winner_name = $4, winning_bid_id = $5
     WHERE id = $1`,
    [carId, result.status, result.winnerEmail, result.winnerName, result.winningBidId],
  );
  if (result.status === "ended_with_winner" && result.winnerEmail) {
    const { rows: carRows } = await db.query<{ title: string }>(`SELECT title FROM cars WHERE id = $1`, [carId]);
    await emitUserNotification(
      result.winnerEmail,
      "auction_won",
      "You won the auction!",
      `You won ${carRows[0]?.title ?? "the car"}. The admin will contact you.`,
      carId,
    );
    const { rows: bidderRows } = await db.query<{ user_email: string }>(
      `SELECT DISTINCT user_email FROM bids WHERE car_id = $1 AND user_email IS NOT NULL AND user_email != $2`,
      [carId, result.winnerEmail],
    );
    for (const b of bidderRows) {
      await emitUserNotification(b.user_email, "auction_lost", "Auction ended", "Another bidder won this auction.", carId);
    }
    await markLosersRefundPending(db, carId, result.winnerEmail);
  }
}

export const resolveExpiredCar = createServerFn({ method: "POST" })
  .inputValidator((carId: string) => carId)
  .handler(async ({ data: carId }): Promise<DbCar> => {
    await finalizeExpiredCar(carId);
    const { rows } = await getDb().query<DbCar>(`SELECT * FROM cars WHERE id = $1`, [carId]);
    if (!rows[0]) throw new Error("Car not found");
    return rows[0];
  });

export const getBidsForUser = createServerFn()
  .inputValidator((userName: string) => userName)
  .handler(async ({ data: userName }): Promise<(DbBid & { car_title: string; car_brand: string; car_year: number; is_live: boolean; ends_at: number | null })[]> => {
    const db = getDb();
    const { rows } = await db.query(
      `SELECT b.*, c.title AS car_title, c.brand AS car_brand, c.year AS car_year, c.is_live, c.ends_at
       FROM bids b
       JOIN cars c ON c.id = b.car_id
       WHERE b.user_name = $1
       ORDER BY b.created_at DESC`,
      [userName]
    );
    return rows as ReturnType<typeof getBidsForUser> extends Promise<infer T> ? T : never;
  });

export const markExpiredAuctions = createServerFn().handler(async (): Promise<number> => {
  const db = getDb();
  const now = Date.now();
  const { rows: expired } = await db.query<{ id: string }>(
    `SELECT id FROM cars WHERE is_live = 1 AND is_sold = 0 AND ends_at IS NOT NULL AND ends_at < $1`,
    [now],
  );
  for (const car of expired) {
    await finalizeExpiredCar(car.id);
  }
  return expired.length;
});

export const getSoldCarsFromDb = createServerFn().handler(async (): Promise<DbCar[]> => {
  const db = getDb();
  // MySQL doesn't support NULLS LAST — use IS NULL sort trick
  const { rows } = await db.query<DbCar & { bids_count: number }>(
    `SELECT c.*, COUNT(b.id) AS bids_count
     FROM cars c
     LEFT JOIN bids b ON b.car_id = c.id
     WHERE c.is_sold = 1
     GROUP BY c.id
     ORDER BY c.sold_at IS NULL ASC, c.sold_at DESC`
  );
  return rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) }));
});

export type DbUser = {
  id: number;
  clerk_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export const getUsersFromDb = createServerFn().handler(async (): Promise<DbUser[]> => {
  const db = getDb();
  const { rows } = await db.query<DbUser>(
    `SELECT id, clerk_id, name, email, phone, created_at FROM users ORDER BY created_at DESC`
  );
  return rows;
});

export type ProxyBid = {
  id: number;
  car_id: string;
  user_name: string;
  max_amount: number;
  created_at: string;
};

export const setProxyBid = createServerFn()
  .inputValidator((input: { carId: string; maxAmount: number }) => input)
  .handler(async ({ data }): Promise<ProxyBid> => {
    const bidder = await requireBidderAuth();
    const db = getDb();
    const paid = await hasPaidDeposit(db, bidder.email, data.carId);
    if (!paid) throw new Error("Deposit required before setting proxy bid");
    await db.query(
      `INSERT INTO proxy_bids (car_id, user_name, max_amount)
       VALUES ($1, $2, $3)
       ON DUPLICATE KEY UPDATE max_amount = VALUES(max_amount), created_at = NOW()`,
      [data.carId, bidder.name, data.maxAmount]
    );
    const { rows } = await db.query<ProxyBid>(
      `SELECT * FROM proxy_bids WHERE car_id = $1 AND user_name = $2`,
      [data.carId, bidder.name]
    );
    return rows[0];
  });

export const getProxyBid = createServerFn()
  .inputValidator((input: { carId: string; userName: string }) => input)
  .handler(async ({ data }): Promise<ProxyBid | null> => {
    const db = getDb();
    const { rows } = await db.query<ProxyBid>(
      `SELECT * FROM proxy_bids WHERE car_id = $1 AND user_name = $2`,
      [data.carId, data.userName]
    );
    return rows[0] ?? null;
  });

export const getBidsForUserWithStatus = createServerFn()
  .inputValidator((input: { userEmail: string; userName?: string }) => input)
  .handler(async ({ data }): Promise<(DbBid & {
    car_title: string;
    car_brand: string;
    car_year: number;
    car_image: string | null;
    is_live: boolean;
    is_sold: boolean;
    ends_at: number | null;
    final_bid: number | null;
    auction_status: string | null;
    won: boolean | null;
    bid_status: "leading" | "won_pending" | "won" | "lost" | null;
    is_leading: boolean;
    total_bids: number;
  })[]> => {
    const db = getDb();
    const email = data.userEmail;
    const name = data.userName ?? "";
    const { rows } = await db.query(
      `SELECT id, car_id, user_name, user_email, amount, created_at,
              car_title, car_brand, car_year, car_image,
              is_live, is_sold, ends_at, final_bid, auction_status,
              CAST(is_leading AS UNSIGNED) = 1 AS is_leading,
              total_bids, won, bid_status
       FROM (
         SELECT b.id, b.car_id, b.user_name, b.user_email, b.amount, b.created_at,
                c.title AS car_title, c.brand AS car_brand, c.year AS car_year,
                c.image_url AS car_image, c.is_live, c.is_sold, c.ends_at,
                c.current_bid AS final_bid, c.auction_status,
                (b.amount = c.current_bid AND c.is_live = 1) AS is_leading,
                (SELECT COUNT(*) FROM bids WHERE car_id = c.id) AS total_bids,
                CASE
                  WHEN c.is_sold = 1 AND c.winner_email = ? THEN 1
                  WHEN c.is_sold = 1 THEN 0
                  WHEN c.auction_status = 'ended_with_winner' AND c.winner_email = ? THEN NULL
                  WHEN c.auction_status IN ('ended','ended_with_winner','no_sale') AND c.winner_email IS NOT NULL AND c.winner_email != ? THEN 0
                  ELSE NULL
                END AS won,
                CASE
                  WHEN c.is_sold = 1 AND c.winner_email = ? THEN 'won'
                  WHEN c.auction_status = 'ended_with_winner' AND c.winner_email = ? THEN 'won_pending'
                  WHEN c.is_live = 1 AND b.amount = c.current_bid THEN 'leading'
                  WHEN c.auction_status IN ('ended','ended_with_winner','no_sale','sold') AND (c.winner_email IS NULL OR c.winner_email != ?) THEN 'lost'
                  ELSE NULL
                END AS bid_status,
                ROW_NUMBER() OVER (PARTITION BY b.car_id ORDER BY b.amount DESC) AS rn
         FROM bids b
         JOIN cars c ON c.id = b.car_id
         WHERE b.user_email = ? OR (b.user_email IS NULL AND b.user_name = ?)
       ) ranked
       WHERE rn = 1`,
      [email, email, email, email, email, email, email, name],
    );
    return rows.map((r) => ({
      ...r,
      is_leading: Boolean(r.is_leading),
      won: r.won === null ? null : Boolean(r.won),
      total_bids: Number(r.total_bids),
    })) as ReturnType<typeof getBidsForUserWithStatus> extends Promise<infer T> ? T : never;
  });
