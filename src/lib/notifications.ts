export type AppNotification = {
  id: string;
  type: "outbid" | "auction_ending" | "auction_won" | "auction_lost" | "price_alert" | "new_listing" | "entry_submitted" | "entry_approved" | "entry_rejected" | "broadcast";
  title: string;
  body: string;
  carId?: string;
  isRead: boolean;
  createdAt: number;
};

const KEY = "apex_notifications";

export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addNotification(n: Omit<AppNotification, "id" | "isRead" | "createdAt">) {
  const all = getNotifications();
  const item: AppNotification = {
    ...n,
    id: Math.random().toString(36).slice(2),
    isRead: false,
    createdAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify([item, ...all].slice(0, 50)));
  window.dispatchEvent(new Event("apex_notifications_changed"));
  return item;
}

export function markAllRead() {
  const all = getNotifications().map((n) => ({ ...n, isRead: true }));
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("apex_notifications_changed"));
}

export function markRead(id: string) {
  const all = getNotifications().map((n) => (n.id === id ? { ...n, isRead: true } : n));
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("apex_notifications_changed"));
}

export function clearNotifications() {
  localStorage.setItem(KEY, "[]");
  window.dispatchEvent(new Event("apex_notifications_changed"));
}

export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.isRead).length;
}

const BROADCAST_SEEN_KEY = "apex_broadcast_seen";

/** Merge server broadcasts into local notifications (once per broadcast id). */
export function syncBroadcastNotifications(
  broadcasts: { id: number; title: string; body: string }[],
) {
  if (typeof window === "undefined" || broadcasts.length === 0) return;
  let seen: number[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(BROADCAST_SEEN_KEY) ?? "[]");
  } catch {
    seen = [];
  }
  const seenSet = new Set(seen);
  for (const b of broadcasts) {
    if (seenSet.has(b.id)) continue;
    addNotification({ type: "broadcast", title: b.title, body: b.body });
    seenSet.add(b.id);
  }
  localStorage.setItem(BROADCAST_SEEN_KEY, JSON.stringify([...seenSet]));
}
