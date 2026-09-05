import type { Plugin } from "vite";
import { WebSocketServer } from "ws";
import { registerChatClient } from "./ws-hub";

export function chatWsPlugin(): Plugin {
  return {
    name: "chat-ws",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on("upgrade", (req, socket, head) => {
        if (!req.url?.startsWith("/ws/chat")) return;

        wss.handleUpgrade(req, socket, head, (ws) => {
          const url = new URL(req.url!, `http://${req.headers.host}`);
          const role = (url.searchParams.get("role") ?? "buyer") as "buyer" | "admin";
          const carId = url.searchParams.get("carId") ?? undefined;
          const buyerEmail = url.searchParams.get("buyerEmail") ?? undefined;
          registerChatClient(ws, { role, carId, buyerEmail });
        });
      });
    },
  };
}
