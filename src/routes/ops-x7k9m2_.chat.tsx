import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { CarChatView } from "@/components/chat/CarChatView";
import { getAdminChats, type ChatConversation, type ChatMessage } from "@/lib/chat.server";
import { getUser } from "@/lib/auth.server";
import { getMergedAdminEmailsForLoader } from "@/lib/admin.server";
import { resolveClientIsAdmin } from "@/lib/admin-access";
import { brandPageTitle } from "@/lib/brand";
import { useLanguage } from "@/lib/language";
import { useChatWebSocket } from "@/lib/use-chat-ws";

type ChatSearch = {
  car?: string;
  buyer?: string;
};

export const Route = createFileRoute("/ops-x7k9m2_/chat")({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    car: typeof search.car === "string" ? search.car : undefined,
    buyer: typeof search.buyer === "string" ? search.buyer : undefined,
  }),
  head: () => ({ meta: [{ title: brandPageTitle("Admin Chat") }] }),
  loader: async ({ context }) => {
    const user = context.user ?? await getUser();
    if (user && !user.isAdmin) throw redirect({ to: "/" });
    const chats = await getAdminChats();
    const adminEmails = await getMergedAdminEmailsForLoader();
    return { chats, isAdmin: user?.isAdmin ?? false, adminEmails };
  },
  component: AdminChatPage,
});

function AdminChatPage() {
  const { chats: initialChats, adminEmails, isAdmin: serverIsAdmin } = Route.useLoaderData();
  const { car: selectedCarId, buyer: selectedBuyer } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();
  const [chats, setChats] = useState<ChatConversation[]>(initialChats);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isAdmin =
    serverIsAdmin ||
    resolveClientIsAdmin(user, undefined, adminEmails);

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      navigate({ to: "/" });
    }
  }, [isLoaded, isAdmin, navigate]);

  useChatWebSocket({
    enabled: isAdmin,
    role: "admin",
    onMessage: (msg: ChatMessage) => {
      setChats((prev) => {
        const idx = prev.findIndex(
          (c) => c.car_id === msg.car_id && c.buyer_email === msg.buyer_email,
        );
        if (idx === -1) return prev;
        const updated = [...prev];
        const convo = updated[idx];
        updated[idx] = {
          ...convo,
          messages: convo.messages.some((m) => m.id === msg.id)
            ? convo.messages
            : [...convo.messages, msg],
          last_message: msg.message,
          last_at: msg.created_at,
        };
        return updated;
      });
    },
  });

  const selected = useMemo(
    () => chats.find((c) => c.car_id === selectedCarId && c.buyer_email === selectedBuyer) ?? null,
    [chats, selectedCarId, selectedBuyer],
  );

  const selectConvo = (convo: ChatConversation) => {
    navigate({
      to: "/ops-x7k9m2/chat",
      search: { car: convo.car_id, buyer: convo.buyer_email },
    });
  };

  return (
    <div className="min-h-screen pb-nav flex flex-col">
      <Header />
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-4 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <Link
            to="/ops-x7k9m2"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("admin_back_panel")}
          </Link>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary-glow" />
            {t("admin_messages")}
          </h1>
          <Badge variant="outline" className="ms-auto">{chats.length} {t("admin_conversations")}</Badge>
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100dvh-11rem)]">
          <div className="rounded-2xl bg-gradient-card border border-border/60 overflow-hidden flex flex-col min-h-[280px] lg:min-h-0">
            <div className="px-4 py-3 border-b border-border/40 shrink-0">
              <p className="text-xs text-muted-foreground">{t("admin_messages_sub")}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/20">
              {chats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10 px-4">{t("admin_no_msgs")}</p>
              ) : (
                chats.map((convo) => {
                  const key = `${convo.car_id}::${convo.buyer_email}`;
                  const active = selectedCarId === convo.car_id && selectedBuyer === convo.buyer_email;
                  const displayName = convo.buyer_name || convo.buyer_email;
                  const lastDate = new Date(convo.last_at);
                  const diffH = now ? Math.floor((now - lastDate.getTime()) / 3_600_000) : 0;
                  const timeStr = !now
                    ? ""
                    : diffH < 1
                    ? lastDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : diffH < 24
                    ? `${diffH}h`
                    : lastDate.toLocaleDateString([], { month: "short", day: "numeric" });

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectConvo(convo)}
                      className={`w-full text-start px-4 py-3.5 hover:bg-secondary/10 transition-smooth ${
                        active ? "bg-primary/10 border-s-2 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${active ? "font-bold text-primary-glow" : "font-medium"}`}>
                          {displayName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{convo.car_title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{convo.last_message}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-card border border-border/60 overflow-hidden flex flex-col min-h-[420px] lg:min-h-0">
            {selected ? (
              <CarChatView
                carId={selected.car_id}
                carTitle={selected.car_title}
                buyerEmail={selected.buyer_email}
                buyerName={selected.buyer_name}
                senderRole="admin"
                backLink={
                  <Link
                    to="/ops-x7k9m2/chat"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("admin_all_chats")}
                  </Link>
                }
                peerLabel={selected.buyer_name || selected.buyer_email}
                fillViewport={false}
                className="h-full min-h-[420px] lg:min-h-0"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">{t("admin_select_conversation")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
