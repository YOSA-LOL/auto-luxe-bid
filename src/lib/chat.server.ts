import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";

export type ChatMessage = {
  id: number;
  car_id: string;
  buyer_email: string;
  buyer_name: string;
  sender_role: "buyer" | "admin";
  message: string;
  created_at: string;
};

export type ChatConversation = {
  car_id: string;
  car_title: string;
  buyer_email: string;
  buyer_name: string;
  last_message: string;
  last_at: string;
  unread: number;
  messages: ChatMessage[];
};

/** Send a message (buyer or admin) */
export const sendChatMessage = createServerFn()
  .inputValidator((input: {
    carId: string;
    buyerEmail: string;
    buyerName: string;
    senderRole: "buyer" | "admin";
    message: string;
  }) => input)
  .handler(async ({ data }): Promise<ChatMessage> => {
    const db = getDb();
    // MySQL doesn't support RETURNING — insert then fetch by LAST_INSERT_ID()
    await db.query(
      `INSERT INTO chat_messages (car_id, buyer_email, buyer_name, sender_role, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.carId, data.buyerEmail, data.buyerName, data.senderRole, data.message]
    );
    const { rows } = await db.query<ChatMessage>(
      `SELECT * FROM chat_messages WHERE id = LAST_INSERT_ID()`
    );
    return rows[0];
  });

/** Get messages for one conversation (buyer view) */
export const getChatMessages = createServerFn()
  .inputValidator((input: { carId: string; buyerEmail: string }) => input)
  .handler(async ({ data }): Promise<ChatMessage[]> => {
    const db = getDb();
    const { rows } = await db.query<ChatMessage>(
      `SELECT * FROM chat_messages
       WHERE car_id = $1 AND buyer_email = $2
       ORDER BY created_at ASC`,
      [data.carId, data.buyerEmail]
    );
    return rows;
  });

/** Admin: get all conversations with their messages */
export const getAdminChats = createServerFn().handler(async (): Promise<ChatConversation[]> => {
  const db = getDb();

  // MySQL equivalent of DISTINCT ON — latest message per (car_id, buyer_email)
  const { rows: convos } = await db.query<{
    car_id: string; buyer_email: string; buyer_name: string; last_message: string; last_at: string;
  }>(
    `SELECT car_id, buyer_email, buyer_name, message AS last_message, created_at AS last_at
     FROM (
       SELECT car_id, buyer_email, buyer_name, message, created_at,
              ROW_NUMBER() OVER (PARTITION BY car_id, buyer_email ORDER BY created_at DESC) AS rn
       FROM chat_messages
     ) t WHERE rn = 1`
  );

  if (convos.length === 0) return [];

  // All messages for all conversations
  // MySQL supports row value constructor IN for 8.0+
  const pairs = convos.map(() => "(?, ?)").join(", ");
  const pairParams = convos.flatMap((c) => [c.car_id, c.buyer_email]);
  const { rows: allMessages } = await db.query<ChatMessage>(
    `SELECT * FROM chat_messages
     WHERE (car_id, buyer_email) IN (${pairs})
     ORDER BY created_at ASC`,
    pairParams
  );

  // Car titles
  const carIds = [...new Set(convos.map((c) => c.car_id))];
  const inPlaceholders = carIds.map(() => "?").join(", ");
  const { rows: carRows } = await db.query<{ id: string; title: string }>(
    `SELECT id, title FROM cars WHERE id IN (${inPlaceholders})`,
    carIds
  );
  const carTitles: Record<string, string> = {};
  carRows.forEach((r) => { carTitles[r.id] = r.title; });

  return convos.map((c) => ({
    car_id: c.car_id,
    car_title: carTitles[c.car_id] ?? c.car_id,
    buyer_email: c.buyer_email,
    buyer_name: c.buyer_name,
    last_message: c.last_message,
    last_at: c.last_at,
    unread: 0,
    messages: allMessages.filter(
      (m) => m.car_id === c.car_id && m.buyer_email === c.buyer_email
    ),
  }));
});
