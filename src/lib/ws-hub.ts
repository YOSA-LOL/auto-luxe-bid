import type { WebSocket } from "ws";
import type { ChatMessage } from "./chat.server";

type ClientMeta = {
  role: "buyer" | "admin";
  carId?: string;
  buyerEmail?: string;
};

const clients = new Set<{ ws: WebSocket; meta: ClientMeta }>();

export function registerChatClient(ws: WebSocket, meta: ClientMeta) {
  const entry = { ws, meta };
  clients.add(entry);

  ws.on("close", () => clients.delete(entry));
  ws.on("error", () => clients.delete(entry));

  ws.send(JSON.stringify({ type: "connected", role: meta.role }));
}

export function broadcastChatMessage(
  carId: string,
  buyerEmail: string,
  message: ChatMessage,
) {
  const payload = JSON.stringify({
    type: "chat_message",
    carId,
    buyerEmail,
    message,
  });

  for (const { ws, meta } of clients) {
    if (ws.readyState !== 1) continue;
    const isBuyer =
      meta.role === "buyer" &&
      meta.carId === carId &&
      meta.buyerEmail === buyerEmail;
    const isAdmin = meta.role === "admin";
    if (isBuyer || isAdmin) {
      ws.send(payload);
    }
  }
}
