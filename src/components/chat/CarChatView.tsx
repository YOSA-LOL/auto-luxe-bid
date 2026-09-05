import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { getChatMessages, sendChatMessage, type ChatMessage } from "@/lib/chat.server";
import { useChatWebSocket } from "@/lib/use-chat-ws";
import { toast } from "sonner";

type CarChatViewProps = {
  carId: string;
  carTitle: string;
  buyerEmail: string;
  buyerName: string;
  senderRole: "buyer" | "admin";
  backLink: ReactNode;
  peerLabel: string;
  className?: string;
  fillViewport?: boolean;
};

export function CarChatView({
  carId,
  carTitle,
  buyerEmail,
  buyerName,
  senderRole,
  backLink,
  peerLabel,
  className = "",
  fillViewport = true,
}: CarChatViewProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!buyerEmail) return;
    const msgs = await getChatMessages({ data: { carId, buyerEmail } });
    setMessages(msgs);
  }, [carId, buyerEmail]);

  useEffect(() => {
    if (!buyerEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadMessages()
      .catch(() => toast.error(t("chat_send_fail")))
      .finally(() => setLoading(false));
  }, [buyerEmail, loadMessages, t]);

  useChatWebSocket({
    enabled: !!buyerEmail,
    role: senderRole,
    carId,
    buyerEmail,
    onMessage: (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !buyerEmail) return;
    setSending(true);
    setText("");
    try {
      const msg = await sendChatMessage({
        data: {
          carId,
          buyerEmail,
          buyerName,
          senderRole,
          message: trimmed,
        },
      });
      setMessages((prev) => [...prev, msg]);
    } catch {
      toast.error(t("chat_send_fail"));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const heightClass = fillViewport ? "min-h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-4.5rem)]" : "min-h-[32rem]";

  return (
    <div className={`flex flex-col ${heightClass} ${className}`}>
      <div className="shrink-0 flex items-center gap-3 px-1 py-3 border-b border-border/40">
        {backLink}
        <div className="flex-1 min-w-0 text-center">
          <p className="font-display font-semibold text-sm truncate">{carTitle}</p>
          <p className="text-[11px] text-muted-foreground truncate">{peerLabel}</p>
        </div>
        <MessageCircle className="h-5 w-5 text-primary-glow shrink-0" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 space-y-3">
        {!buyerEmail ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("chat_sign_in")}</p>
        ) : loading && messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("loading_text")}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("chat_no_messages")}</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === senderRole;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary/60 border border-border/40 rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <div className={`text-[10px] mt-1 opacity-70 ${isMine ? "text-end" : ""}`}>
                    {isMine ? t("chat_you") : peerLabel}
                    {" · "}
                    {new Date(m.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="shrink-0 flex gap-2 p-3 sm:p-4 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={buyerEmail ? t("chat_type_ph") : t("chat_sign_in")}
          disabled={!buyerEmail || sending}
          className="flex-1 bg-background/50 border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={!buyerEmail || sending || !text.trim()}
          className="bg-gradient-primary border-0 text-primary-foreground rounded-full w-11 h-11 p-0 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
