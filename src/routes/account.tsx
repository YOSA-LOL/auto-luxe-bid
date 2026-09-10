import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getBidsForUserWithStatus, getCarsFromDb } from "@/lib/cars.server";
import { getUserDeposits, type UserDeposit } from "@/lib/deposits.server";
import { getUserNotifications } from "@/lib/user-notifications.server";
import { formatPrice } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User, Gavel, Heart, Radio, Clock, TrendingUp, Car, ChevronRight, CircleCheck,
  Trophy, CircleX, Bell, Search, Eye, Bookmark, X, CheckCircle2, Shield, Wallet,
} from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { Route as RootRoute } from "@/routes/__root";
import { useUser, useClerk } from "@clerk/tanstack-react-start";
import {
  getNotifications, markAllRead, markRead, clearNotifications, getUnreadCount,
  syncBroadcastNotifications, addNotification, type AppNotification,
} from "@/lib/notifications";
import { getBroadcastNotifications } from "@/lib/admin.server";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { dbCarToApp } from "@/lib/types";
import type { AppCar } from "@/lib/types";

import { useLanguage } from "@/lib/language";
import { brandPageTitle } from "@/lib/brand";
import { useIsAdmin } from "@/lib/use-is-admin";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: brandPageTitle("My Account") }] }),
  loader: async () => {
    const allCars = await getCarsFromDb();
    return { allCars: allCars.map(dbCarToApp) };
  },
  component: AccountPage,
});

function AccountPage() {
  const { allCars } = Route.useLoaderData();
  const { t, isAr } = useLanguage();
  const { user: ssrUser, adminEmails = [] } = RootRoute.useRouteContext();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  const user = isLoaded && clerkUser
    ? {
        id: clerkUser.id,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "User",
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        picture: clerkUser.imageUrl ?? undefined,
      }
    : ssrUser;

  const isAdmin = useIsAdmin({
    clerkUser,
    isLoaded,
    ssrIsAdmin: ssrUser?.isAdmin,
    serverAdminEmails: adminEmails,
    fallbackEmail: user?.email,
  });

  const { count: favCount } = useFavorites();
  const [activeTab, setActiveTab] = useState<"bids" | "deposits" | "profile" | "notifications" | "recent" | "searches">("bids");
  const [bids, setBids] = useState<Awaited<ReturnType<typeof getBidsForUserWithStatus>>>([]);
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [recentCars, setRecentCars] = useState<AppCar[]>([]);
  const [savedSearches, setSavedSearches] = useState<{ label: string; q: string }[]>([]);
  const [newSearch, setNewSearch] = useState("");
  const [profile, setProfile] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;
    getBidsForUserWithStatus({ data: { userEmail: user.email, userName: user.name } })
      .then(setBids)
      .catch(() => setBids([]));
    getUserDeposits({ data: user.email }).then(setDeposits).catch(() => setDeposits([]));
    getUserNotifications({ data: user.email }).then((rows) => {
      const mapped: AppNotification[] = rows.map((n) => ({
        id: `db-${n.id}`,
        type: n.type as AppNotification["type"],
        title: n.title,
        body: n.body ?? "",
        carId: n.car_id ?? undefined,
        createdAt: new Date(n.created_at).getTime(),
        isRead: Boolean(n.read_at),
      }));
      for (const m of mapped) {
        if (!getNotifications().some((x) => x.id === m.id)) {
          addNotification({ type: m.type, title: m.title, body: m.body, carId: m.carId });
        }
      }
    }).catch(() => {});
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (user) {
      setProfile((p) => ({
        name: p.name || user.name || "",
        email: p.email || user.email || "",
        phone: p.phone,
      }));
    }
  }, [user?.name, user?.email]);

  const totalBid = bids.reduce((sum, b) => sum + b.amount, 0);
  const activeBids = bids.filter((b) => b.is_live).length;
  const uniqueCars = new Set(bids.map((b) => b.car_id)).size;
  const wonBids = bids.filter((b) => b.won === true).length;

  useEffect(() => {
    const load = () => {
      setNotifications(getNotifications());
      setUnreadCount(getUnreadCount());
      const ids = getRecentlyViewed();
      setRecentIds(ids);
      setRecentCars(ids.map((id) => allCars.find((c) => c.id === id)).filter(Boolean) as AppCar[]);
      try {
        setSavedSearches(JSON.parse(localStorage.getItem("apex_saved_searches") ?? "[]"));
      } catch { setSavedSearches([]); }
    };
    load();
    getBroadcastNotifications()
      .then((broadcasts) => {
        syncBroadcastNotifications(broadcasts);
        load();
      })
      .catch(() => {});
    window.addEventListener("apex_notifications_changed", load);
    return () => window.removeEventListener("apex_notifications_changed", load);
  }, [allCars]);

  const saveSearch = () => {
    if (!newSearch.trim()) return;
    const all = [...savedSearches, { label: newSearch.trim(), q: newSearch.trim() }];
    localStorage.setItem("apex_saved_searches", JSON.stringify(all));
    setSavedSearches(all);
    setNewSearch("");
  };

  const removeSearch = (i: number) => {
    const all = savedSearches.filter((_, j) => j !== i);
    localStorage.setItem("apex_saved_searches", JSON.stringify(all));
    setSavedSearches(all);
  };

  const tabs = [
    { id: "bids", label: t("account_tab_bids"), icon: Gavel },
    { id: "deposits", label: t("account_deposits"), icon: Wallet },
    { id: "notifications", label: t("account_tab_notif"), icon: Bell, badge: unreadCount },
    { id: "recent", label: t("account_tab_recent"), icon: Eye },
    { id: "searches", label: t("account_tab_searches"), icon: Bookmark },
    { id: "profile", label: t("account_tab_profile"), icon: User },
  ] as const;

  return (
    <div className="min-h-screen pb-nav">
      <Header />
      <div className="page-content max-w-5xl py-6 md:py-8">
        <div className="rounded-3xl glass-strong border border-border/60 p-6 md:p-8 mb-6 shadow-elegant">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow shrink-0 overflow-hidden">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 md:h-9 md:w-9 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold">{user?.name || "—"}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{user?.email || "—"}</p>
              <Badge variant="outline" className="mt-2 glass border-primary/30 gap-1 text-xs">
                <CircleCheck className="h-3 w-3 text-primary-glow" /> {t("badge_verified_buyer")}
              </Badge>
              {isAdmin && (
                <Button asChild size="sm" className="mt-3 bg-gradient-primary border-0 text-primary-foreground">
                  <Link to="/ops-x7k9m2">
                    <Shield className="h-3.5 w-3.5 me-1.5" />
                    {t("nav_admin_panel")}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-border/40">
            {[
              { icon: Gavel, label: t("account_stat_bids"), value: bids.length },
              { icon: Car, label: t("account_stat_cars"), value: uniqueCars },
              { icon: Radio, label: t("account_stat_active"), value: activeBids },
              { icon: Trophy, label: t("account_stat_won"), value: wonBids },
              { icon: Heart, label: t("account_stat_favorites"), value: favCount },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-3 text-center">
                <s.icon className="h-4 w-4 text-primary-glow mx-auto mb-1" />
                <div className="font-display text-xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-smooth ${activeTab === tab.id ? "bg-gradient-primary text-primary-foreground" : "glass hover:bg-secondary/50"}`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {(tab as { badge?: number }).badge ? (
                <span className="h-4 w-4 rounded-full bg-[var(--live)] text-white text-[10px] flex items-center justify-center font-bold">
                  {(tab as { badge?: number }).badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {activeTab === "bids" && (
          <div className="space-y-3">
            {bids.length === 0 ? (
              <div className="rounded-2xl glass-strong border border-border/40 p-12 text-center">
                <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">{t("account_no_bids")}</h3>
                <p className="text-muted-foreground text-sm mb-5">{t("account_bids_empty_p")}</p>
                <Button asChild className="bg-gradient-primary border-0 text-primary-foreground">
                  <Link to="/auctions">{t("account_view_auctions")}</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-gradient-card border border-border/60 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary-glow" />
                    <span className="text-sm text-muted-foreground">{t("account_total_bid")}</span>
                  </div>
                  <span className="font-display font-bold text-lg text-gradient-primary">{formatPrice(totalBid)}</span>
                </div>
                {bids.map((b) => (
                  <Link
                    key={b.id}
                    to="/cars/$carId"
                    params={{ carId: b.car_id }}
                    className="flex items-center gap-4 rounded-2xl glass-strong border border-border/40 p-4 hover:border-primary/40 transition-smooth group"
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${b.won === true ? "bg-[var(--success)]/20" : b.won === false ? "bg-destructive/10" : "bg-gradient-primary/20"}`}>
                      {b.won === true ? <Trophy className="h-4 w-4 text-[var(--success)]" /> : b.won === false ? <CircleX className="h-4 w-4 text-destructive" /> : <Gavel className="h-4 w-4 text-primary-glow" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-sm truncate">{b.car_title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>{b.car_brand} · {b.car_year}</span>
                        {b.is_live && (
                          <Badge className="bg-[var(--live)] text-white border-0 text-[9px] px-1.5 py-0 animate-pulse-live gap-0.5">
                            <Radio className="h-2 w-2" /> {t("badge_live")}
                          </Badge>
                        )}
                        {b.won === true && <Badge className="bg-[var(--success)]/20 text-[var(--success)] border-0 text-[9px] px-1.5 py-0 gap-0.5"><Trophy className="h-2 w-2" /> {t("account_status_won_badge")}</Badge>}
                        {(b as { bid_status?: string }).bid_status === "won_pending" && <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[9px] px-1.5 py-0 gap-0.5"><Trophy className="h-2 w-2" /> {t("account_won_pending")}</Badge>}
                        {b.won === false && <Badge className="bg-destructive/10 text-destructive border-0 text-[9px] px-1.5 py-0">{t("account_status_ended_badge")}</Badge>}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="font-display font-bold text-primary-glow">{formatPrice(b.amount)}</div>
                      <div className="text-xs text-muted-foreground">{t("account_your_bid")}</div>
                      {b.final_bid && b.final_bid !== b.amount && (
                        <div className="text-xs text-muted-foreground">{t("account_final_bid")} {formatPrice(b.final_bid)}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth" />
                  </Link>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "deposits" && (
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <div className="rounded-2xl glass-strong border border-border/40 p-12 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">{t("account_deposits")}</h3>
                <p className="text-muted-foreground text-sm">—</p>
              </div>
            ) : (
              deposits.map((d) => (
                <Link
                  key={d.id}
                  to="/cars/$carId"
                  params={{ carId: d.car_id }}
                  className="flex items-center gap-4 rounded-2xl glass-strong border border-border/40 p-4 hover:border-primary/40 transition-smooth"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm truncate">{d.car_title ?? d.car_id}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {d.refund_status === "pending"
                        ? t("account_deposit_pending_refund")
                        : d.refund_status === "refunded"
                          ? t("account_deposit_refunded")
                          : t("account_deposit_paid")}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="font-display font-bold text-primary-glow">{formatPrice(Number(d.amount))}</div>
                    {d.refund_amount != null && d.refund_status !== "none" && (
                      <div className="text-xs text-muted-foreground">{formatPrice(Number(d.refund_amount))}</div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</span>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button className="text-xs text-primary-glow hover:underline" onClick={() => { markAllRead(); }}>{t("account_mark_read")}</button>
                )}
                {notifications.length > 0 && (
                  <button className="text-xs text-muted-foreground hover:underline" onClick={() => { clearNotifications(); }}>{t("account_clear_notif")}</button>
                )}
              </div>
            </div>
            {notifications.length === 0 ? (
              <div className="rounded-2xl glass-strong border border-border/40 p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">{t("account_no_notif")}</h3>
                <p className="text-muted-foreground text-sm">{t("account_notif_empty_p")}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-smooth ${n.isRead ? "glass border-border/40" : "glass-strong border-primary/30 shadow-glow/5"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "auction_won" ? "bg-[var(--success)]/20" : n.type === "outbid" ? "bg-yellow-500/20" : "bg-primary/20"}`}>
                      {n.type === "auction_won" ? <Trophy className="h-4 w-4 text-[var(--success)]" /> : n.type === "outbid" ? <Gavel className="h-4 w-4 text-yellow-400" /> : <Bell className="h-4 w-4 text-primary-glow" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{n.title}</span>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                      <span className="text-[11px] text-muted-foreground mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    {n.carId && (
                      <Link to="/cars/$carId" params={{ carId: n.carId }} className="text-xs text-primary-glow hover:underline shrink-0">
                        {t("account_view")}
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "recent" && (
          <div>
            {recentCars.length === 0 ? (
              <div className="rounded-2xl glass-strong border border-border/40 p-12 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">{t("account_no_recent")}</h3>
                <p className="text-muted-foreground text-sm mb-5">{t("account_recent_empty_p")}</p>
                <Button asChild className="bg-gradient-primary border-0 text-primary-foreground">
                  <Link to="/browse" search={{ q: "" }}>{t("fav_browse")}</Link>
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentCars.map((car) => (
                  <Link
                    key={car.id}
                    to="/cars/$carId"
                    params={{ carId: car.id }}
                    className="group glass rounded-2xl p-4 hover-lift border border-border/40 hover:border-primary/30 transition-smooth"
                  >
                    <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3">
                      {car.image ? (
                        <img src={car.image} alt={car.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-secondary/40 flex items-center justify-center">
                          <Car className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{car.brand} · {car.year}</div>
                    <div className="font-display font-semibold text-sm mt-0.5 truncate">{car.title}</div>
                    <div className="font-display text-sm font-bold text-gradient-primary mt-1">
                      {formatPrice(car.isLive ? car.currentBid ?? car.price : car.price)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "searches" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newSearch}
                  onChange={(e) => setNewSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveSearch(); }}
                  placeholder={t("account_search_ph")}
                  className="ps-10 bg-background/40"
                />
              </div>
              <Button onClick={saveSearch} className="bg-gradient-primary border-0 text-primary-foreground">{t("account_save_search")}</Button>
            </div>
            {savedSearches.length === 0 ? (
              <div className="rounded-2xl glass-strong border border-border/40 p-12 text-center">
                <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">{t("account_no_searches")}</h3>
                <p className="text-muted-foreground text-sm">{t("account_searches_empty_p")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl glass-strong border border-border/40 p-4">
                    <Search className="h-4 w-4 text-primary-glow shrink-0" />
                    <span className="flex-1 text-sm font-medium">{s.label}</span>
                    <Link
                      to="/browse"
                      search={{ q: s.q }}
                      className="text-xs text-primary-glow hover:underline"
                    >
                      {t("account_search_btn")}
                    </Link>
                    <button onClick={() => removeSearch(i)} className="text-muted-foreground hover:text-destructive transition-smooth">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="rounded-2xl glass-strong border border-border/60 p-6 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-lg">{t("account_profile_title")}</h3>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="text-xs text-primary-glow hover:underline"
              >
                {editingProfile ? t("account_cancel") : t("account_edit")}
              </button>
            </div>
            {editingProfile ? (
              <div className="space-y-4">
                {[
                  { label: t("account_name"), key: "name" as const },
                  { label: t("account_email"), key: "email" as const },
                  { label: t("account_phone"), key: "phone" as const },
                ].map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</label>
                    <Input
                      value={profile[f.key]}
                      onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="bg-background/40"
                    />
                  </div>
                ))}
                <Button
                  className="bg-gradient-primary border-0 text-primary-foreground"
                  onClick={() => {
                    localStorage.setItem("apex_profile", JSON.stringify(profile));
                    setEditingProfile(false);
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 me-2" /> {t("account_save")}
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: t("account_name"), value: profile.name },
                  { label: t("account_email"), value: profile.email },
                  { label: t("account_phone"), value: profile.phone || t("account_not_set") },
                  { label: t("account_type"), value: t("badge_verified_buyer") },
                  { label: t("account_member_since"), value: new Date(2025, 0).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "long", year: "numeric" }) },
                  { label: t("account_total_won"), value: wonBids.toString() },
                ].map((f) => (
                  <div key={f.label} className="glass rounded-xl p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{f.label}</div>
                    <div className="font-medium text-sm">{f.value}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4 border-t border-border/40 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="glass gap-2">
                <Link to="/favorites"><Heart className="h-4 w-4" /> {t("account_fav_link")} ({favCount})</Link>
              </Button>
              <Button asChild variant="outline" className="glass gap-2">
                <Link to="/sold"><Trophy className="h-4 w-4" /> {t("sold_badge")}</Link>
              </Button>
              <Button
                variant="outline"
                className="glass gap-2 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                onClick={() => signOut({ redirectUrl: "/" })}
              >
                <X className="h-4 w-4" /> {t("account_sign_out")}
              </Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
