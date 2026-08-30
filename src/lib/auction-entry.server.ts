import { createServerFn } from "@tanstack/react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { CLERK_SECRET_KEY } from "./clerk-config";
import { resolveIsAdmin } from "./admin-access.server";
import { getDb } from "./db.server";

export type AuctionEntryRequest = {
  id: number;
  user_name: string;
  user_email: string;
  car_id: string;
  car_title: string;
  proof_image_url: string;
  instapay_number: string;
  status: string;
  deposit_amount: number;
  rejection_reason: string | null;
  created_at: string;
};

export type DepositSettings = {
  depositAmount: number;
  paymentInfo: string;
};

export const submitAuctionEntryRequest = createServerFn({ method: "POST" })
  .inputValidator((input: {
    userName: string;
    userEmail: string;
    carId: string;
    carTitle: string;
    proofImageUrl: string;
    instapayNumber: string;
    depositAmount: number;
  }) => input)
  .handler(async ({ data }): Promise<void> => {
    const db = getDb();
    // ON DUPLICATE KEY UPDATE replaces Postgres ON CONFLICT DO UPDATE
    await db.query(
      `INSERT INTO auction_entry_requests
         (user_name, user_email, car_id, car_title, proof_image_url, instapay_number, deposit_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON DUPLICATE KEY UPDATE
         proof_image_url  = VALUES(proof_image_url),
         instapay_number  = VALUES(instapay_number),
         deposit_amount   = VALUES(deposit_amount),
         status           = 'pending',
         rejection_reason = NULL,
         created_at       = NOW()`,
      [data.userName, data.userEmail, data.carId, data.carTitle, data.proofImageUrl, data.instapayNumber, data.depositAmount]
    );
  });

export const getAuctionEntryRequests = createServerFn().handler(async (): Promise<AuctionEntryRequest[]> => {
  const db = getDb();
  const { rows } = await db.query<AuctionEntryRequest>(
    `SELECT * FROM auction_entry_requests ORDER BY created_at DESC`
  );
  return rows;
});

export const getAuctionEntryStatus = createServerFn()
  .inputValidator((input: { carId: string; userEmail: string }) => input)
  .handler(async ({ data }): Promise<AuctionEntryRequest | null> => {
    const db = getDb();
    const { rows } = await db.query<AuctionEntryRequest>(
      `SELECT * FROM auction_entry_requests WHERE car_id = $1 AND user_email = $2`,
      [data.carId, data.userEmail]
    );
    return rows[0] ?? null;
  });

export const updateAuctionEntryStatus = createServerFn()
  .inputValidator((input: {
    id: number;
    status: string;
    rejectionReason?: string;
    userEmail?: string;
    carId?: string;
  }) => input)
  .handler(async ({ data }): Promise<void> => {
    const db = getDb();
    await db.query(
      `UPDATE auction_entry_requests SET status = $1, rejection_reason = $2 WHERE id = $3`,
      [data.status, data.rejectionReason ?? null, data.id]
    );
    if (data.status === "approved" && data.userEmail && data.carId) {
      await db.query(
        `INSERT INTO deposits (user_email, car_id, status, amount)
         VALUES ($1, $2, 'paid', 500)
         ON DUPLICATE KEY UPDATE status = 'paid'`,
        [data.userEmail, data.carId]
      );
    }
  });

export const getAuctionDepositSettings = createServerFn().handler(async (): Promise<DepositSettings> => {
  const db = getDb();
  const { rows } = await db.query<{ key: string; value: string }>(
    `SELECT \`key\`, value FROM site_settings WHERE \`key\` IN ('deposit_amount', 'payment_info')`
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    depositAmount: parseInt(map["deposit_amount"] ?? "500", 10),
    paymentInfo: map["payment_info"] ?? "",
  };
});

export const updateAuctionDepositSettings = createServerFn()
  .inputValidator((input: { depositAmount: number; paymentInfo: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const db = getDb();
    // ON DUPLICATE KEY UPDATE replaces Postgres ON CONFLICT DO UPDATE
    await db.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES ('deposit_amount', $1)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [String(data.depositAmount)]
    );
    await db.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES ('payment_info', $1)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [data.paymentInfo]
    );
  });

/** Returns the admin-pinned hero car ID, or null if none is set. */
export const getHeroCarPin = createServerFn().handler(async (): Promise<string | null> => {
  const db = getDb();
  const { rows } = await db.query<{ value: string }>(
    `SELECT value FROM site_settings WHERE \`key\` = 'featured_hero_car_id'`
  );
  const val = rows[0]?.value ?? "";
  return val.trim() === "" ? null : val.trim();
});

/** Sets the admin-pinned hero car ID. Pass null or empty string to clear. */
export const setHeroCarPin = createServerFn()
  .inputValidator((input: { carId: string | null }) => input)
  .handler(async ({ data }): Promise<void> => {
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");
        const client = clerkClient({ secretKey: CLERK_SECRET_KEY });
        const clerkUser = await client.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
        const isAdmin = resolveIsAdmin(email);
        if (!isAdmin) throw new Error("Forbidden");
      } catch (err: unknown) {
        if (err instanceof Error && (err.message === "Unauthorized" || err.message === "Forbidden")) throw err;
        throw new Error("Authorization check failed");
      }
    }

    const db = getDb();

    if (data.carId) {
      const { rows: carRows } = await db.query<{ id: string }>(
        `SELECT id FROM cars WHERE id = $1 LIMIT 1`,
        [data.carId]
      );
      if (!carRows[0]) throw new Error(`Car not found: ${data.carId}`);
    }

    await db.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES ('featured_hero_car_id', $1)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [data.carId ?? ""]
    );
  });
