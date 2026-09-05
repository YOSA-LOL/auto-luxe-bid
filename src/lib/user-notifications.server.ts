import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";

export type DbUserNotification = {
  id: number;
  user_email: string;
  type: string;
  title: string;
  body: string | null;
  car_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function emitUserNotification(
  userEmail: string,
  type: string,
  title: string,
  body?: string,
  carId?: string,
): Promise<void> {
  const db = getDb();
  await db.query(
    `INSERT INTO user_notifications (user_email, type, title, body, car_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [userEmail, type, title, body ?? null, carId ?? null],
  );
}

export const getUserNotifications = createServerFn()
  .inputValidator((userEmail: string) => userEmail)
  .handler(async ({ data: userEmail }): Promise<DbUserNotification[]> => {
    const db = getDb();
    const { rows } = await db.query<DbUserNotification>(
      `SELECT * FROM user_notifications WHERE user_email = $1 ORDER BY created_at DESC LIMIT 50`,
      [userEmail],
    );
    return rows;
  });

export const markUserNotificationsRead = createServerFn()
  .inputValidator((userEmail: string) => userEmail)
  .handler(async ({ data: userEmail }): Promise<void> => {
    const db = getDb();
    await db.query(
      `UPDATE user_notifications SET read_at = NOW() WHERE user_email = $1 AND read_at IS NULL`,
      [userEmail],
    );
  });
