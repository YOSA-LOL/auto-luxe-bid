import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";

export const getFavoritesForUser = createServerFn()
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }): Promise<string[]> => {
    if (!userId) return [];
    const db = getDb();
    const { rows } = await db.query<{ car_id: string }>(
      `SELECT car_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((r) => r.car_id);
  });

export const addFavoriteInDb = createServerFn()
  .inputValidator((input: { userId: string; carId: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const db = getDb();
    // INSERT IGNORE replaces Postgres ON CONFLICT DO NOTHING
    await db.query(
      `INSERT IGNORE INTO favorites (user_id, car_id) VALUES ($1, $2)`,
      [data.userId, data.carId]
    );
  });

export const removeFavoriteInDb = createServerFn()
  .inputValidator((input: { userId: string; carId: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const db = getDb();
    await db.query(
      `DELETE FROM favorites WHERE user_id = $1 AND car_id = $2`,
      [data.userId, data.carId]
    );
  });
