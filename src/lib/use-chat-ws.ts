import { useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "./chat.server";

type WsPayload =
  | { type: "connected"; role: string }
  | { type: "chat_message"; carId: string; buyerEmail: string; message: ChatMessage };

export function useChatWebSocket(opts: {
  enabled: boolean;
  role: "buyer" | "admin";
  carId?: string;
  buyerEmail?: string;
  onMessage: (msg: ChatMessage) => void;
}) {
  const { enabled, role, carId, buyerEmail, onMessage } = opts;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const params = new URLSearchParams({ role });
    if (carId) params.set("carId", carId);
    if (buyerEmail) params.set("buyerEmail", buyerEmail);

    const ws = new WebSocket(`${proto}//${window.location.host}/ws/chat?${params}`);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as WsPayload;
        if (data.type === "chat_message") {
          onMessageRef.current(data.message);
        }
      } catch {
        /* ignore */
      }
    };

    return ws;
  }, [enabled, role, carId, buyerEmail]);

  useEffect(() => {
    const ws = connect();
    if (!ws) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    ws.onclose = () => {
      retryTimer = setTimeout(() => connect(), 3000);
    };

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      ws.close();
    };
  }, [connect]);
}
