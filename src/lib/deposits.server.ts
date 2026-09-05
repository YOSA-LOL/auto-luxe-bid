import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";
import type { DbPool } from "./db.server";

export type UserDeposit = {
  id: number;
  user_email: string;
  car_id: string;
  amount: number;
  status: string;
  instapay_number: string | null;
  refund_status: string;
  refund_amount: number | null;
  refunded_at: string | null;
  approved_at: string | null;
  created_at: string;
  car_title?: string;
};

/** Check if user has paid deposit for a car (used server-side before bidding). */
export async function hasPaidDeposit(db: DbPool, userEmail: string, carId: string): Promise<boolean> {
  const { rows } = await db.query<{ ok: number }>(
    `SELECT 1 AS ok FROM deposits WHERE user_email = $1 AND car_id = $2 AND status = 'paid' LIMIT 1`,
    [userEmail, carId],
  );
  if (rows[0]) return true;
  const { rows: entryRows } = await db.query<{ ok: number }>(
    `SELECT 1 AS ok FROM auction_entry_requests WHERE user_email = $1 AND car_id = $2 AND status = 'approved' LIMIT 1`,
    [userEmail, carId],
  );
  return Boolean(entryRows[0]);
}

/** Mark non-winner deposits as pending refund (80% of deposit amount). */
export async function markLosersRefundPending(db: DbPool, carId: string, winnerEmail: string | null): Promise<void> {
  await db.query(
    `UPDATE deposits
     SET refund_status = 'pending',
         refund_amount = ROUND(amount * 0.8, 2)
     WHERE car_id = $1
       AND status = 'paid'
       AND refund_status = 'none'
       AND ($2 IS NULL OR user_email != $2)`,
    [carId, winnerEmail],
  );
}

export const getUserDeposits = createServerFn()
  .inputValidator((userEmail: string) => userEmail)
  .handler(async ({ data: userEmail }): Promise<UserDeposit[]> => {
    const db = getDb();
    const { rows } = await db.query<UserDeposit>(
      `SELECT d.*, c.title AS car_title
       FROM deposits d
       LEFT JOIN cars c ON c.id = d.car_id
       WHERE d.user_email = $1
       ORDER BY d.created_at DESC`,
      [userEmail],
    );
    return rows;
  });

export const getPendingRefunds = createServerFn().handler(async (): Promise<UserDeposit[]> => {
  const db = getDb();
  const { rows } = await db.query<UserDeposit>(
    `SELECT d.*, c.title AS car_title
     FROM deposits d
     LEFT JOIN cars c ON c.id = d.car_id
     WHERE d.refund_status = 'pending'
     ORDER BY d.created_at DESC`,
  );
  return rows;
});

export const markDepositRefunded = createServerFn()
  .inputValidator((depositId: number) => depositId)
  .handler(async ({ data: depositId }): Promise<void> => {
    const db = getDb();
    await db.query(
      `UPDATE deposits SET refund_status = 'refunded', refunded_at = NOW() WHERE id = $1`,
      [depositId],
    );
  });

export const hasPaidDepositFn = createServerFn()
  .inputValidator((input: { userEmail: string; carId: string }) => input)
  .handler(async ({ data }): Promise<boolean> => {
    return hasPaidDeposit(getDb(), data.userEmail, data.carId);
  });
