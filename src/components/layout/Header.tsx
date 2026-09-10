import { Link, useRouter, useNavigate, useRouterState } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { Gavel, Search, Heart, User, LogOut, X, Bell, Trophy, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/tanstack-react-start";
import { Route as RootRoute } from "@/routes/__root";
import { useState, useRef, useEffect, useMemo } from "react";
import { useFavorites } from "@/lib/favorites";
import { useLanguage } from "@/lib/language";
import { getCarsFromDb } from "@/lib/cars.server";
import { dbCarToApp } from "@/lib/types";
import type { AppCar } from "@/lib/types";
import { formatPrice } from "@/lib/mock-data";
import { getNotifications, markAllRead, getUnreadCount, syncBroadcastNotifications, type AppNotification } from "@/lib/notifications";
import { getBroadcastNotifications } from "@/lib/admin.server";
import { AppearanceDock } from "@/components/AppearanceDock";
import { useIsAdmin } from "@/lib/use-is-admin";

let cachedCars: AppCar[] | null = null;

export function Header() {
  const { user: ssrUser, adminEmails = [] } = RootRoute.useRouteContext();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const navigate = useNavigate();

  const user = isLoaded
    ? (clerkUser
        ? {
            id: clerkUser.id,
            name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "User",
            email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
            picture: clerkUser.imageUrl ?? undefined,
          }
        : null)
    : ssrUser;

  const isAdmin = useIsAdmin({
    clerkUser,
    isLoaded,
    ssrIsAdmin: ssrUser?.isAdmin,
    serverAdminEmails: adminEmails,
    fallbackEmail: user?.email,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [allCars, setAllCars] = useState<AppCar[]>(cachedCars ?? []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { count } = useFavorites();
  const { lang, setLang, t } = useLanguage();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const navActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setSearchOpen(false);
    setNotifOpen(false);
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    const load = () => {
      setNotifications(getNotifications());
      setUnreadCount(getUnreadCount());
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
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
      if (!cachedCars) {
        getCarsFromDb().then((rows) => {
          const mapped = rows.map(dbCarToApp);
          cachedCars = mapped;
          setAllCars(mapped);
        }).catch(() => {});
      }
    }
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase();
    return allCars.filter((c) =>
      `${c.title} ${c.brand} ${c.model} ${c.city}`.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQ, allCars]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut({ redirectUrl: "/" });
  };

  const openSearch = () => { setSearchOpen(true); setNotifOpen(false); setSearchQ(""); };
  const openNotif = () => { setNotifOpen(true); setSearchOpen(false); setMenuOpen(false); markAllRead(); };

  const goToResult = (id: string) => {
    setSearchOpen(false);
    setSearchQ("");
    navigate({ to: "/cars/$carId", params: { carId: id } });
  };

  const goToSearch = () => {
    setSearchOpen(false);
    navigate({ to: "/browse", search: { q: searchQ } });
  };

  const notifIcon = (type: AppNotification["type"]) => {
    if (type === "auction_won") return <Trophy className="h-4 w-4 text-[var(--success)]" />;
    if (type === "outbid") return <Gavel className="h-4 w-4 text-yellow-400" />;
    if (type === "price_alert") return <Bell className="h-4 w-4 text-primary-glow" />;
    return <Bell className="h-4 w-4 text-primary-glow" />;
  };

  const navLinks = [
    { to: "/browse", label: t("nav_browse"), search: { q: "" } },
    { to: "/auctions", label: t("nav_auctions") },
    { to: "/calendar", label: t("nav_calendar") },
    ...(isAdmin ? [{ to: "/ops-x7k9m2", label: t("nav_admin") }] : []),
  ] as const;

  return (
    <>
    <header className="fixed top-0 inset-x-0 z-[60] w-full">
      <div className="glass-strong neon-header aether-dock-nav">
        <div className="mx-auto flex h-12 md:h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">

          <div className="flex items-center gap-1.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 shrink-0"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={mobileNavOpen ? t("nav_close_menu") : t("nav_open_menu")}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <BrandLogo size="sm" linkToHome compact />
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} {...("search" in l ? { search: l.search } : {})}
                className="aether-nav-link px-4 py-2 text-sm font-medium transition-smooth text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/50"
                data-active={navActive(l.to) ? "true" : undefined}
                activeProps={{
                  className: "aether-nav-link px-4 py-2 text-sm font-medium transition-smooth text-foreground rounded-md",
                  "data-active": "true",
                }}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 shrink-0">
            <AppearanceDock className="hidden sm:flex" />
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg glass border border-border/40 hover:border-primary/40 transition-smooth text-[10px] sm:text-xs font-semibold"
            >
              <span className={lang === "en" ? "text-foreground" : "text-muted-foreground"}>EN</span>
              <span className="text-border/60">|</span>
              <span className={lang === "ar" ? "text-foreground" : "text-muted-foreground"} style={{ fontFamily: "Cairo, sans-serif" }}>ع</span>
            </button>

            <div className="relative" ref={searchRef}>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={openSearch}>
                <Search className="h-4 w-4" />
              </Button>
              {searchOpen && (
                <div className="absolute end-0 top-11 w-[min(20rem,calc(100vw-1.5rem))] glass-strong border border-border/60 rounded-2xl shadow-elegant overflow-hidden z-50 animate-fade-up">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                      ref={searchInputRef}
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && searchQ.trim()) goToSearch(); if (e.key === "Escape") setSearchOpen(false); }}
                      placeholder={t("header_search_ph")}
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                    />
                    {searchQ && <button onClick={() => setSearchQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((c) => (
                        <button key={c.id} onClick={() => goToResult(c.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-smooth text-start">
                          <div className="h-8 w-8 rounded-lg overflow-hidden border border-border/40 shrink-0">
                            {c.image ? <img src={c.image} alt={c.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary/40" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{c.title}</div>
                            <div className="text-xs text-muted-foreground">{c.city} · {formatPrice(c.isLive ? c.currentBid ?? c.price : c.price)}</div>
                          </div>
                          {c.isLive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--live)] text-white font-semibold">{t("badge_live")}</span>}
                        </button>
                      ))}
                      {searchQ.trim() && (
                        <button onClick={goToSearch} className="w-full px-4 py-2.5 text-xs text-primary-glow hover:bg-secondary/40 transition-smooth text-start border-t border-border/40">
                          {t("header_search_see_all", { q: searchQ })}
                        </button>
                      )}
                    </div>
                  ) : searchQ.trim() ? (
                    <div className="px-4 py-5 text-center text-sm text-muted-foreground">{t("header_search_none", { q: searchQ })}</div>
                  ) : (
                    <div className="px-4 py-5 text-center text-sm text-muted-foreground">{t("header_search_type")}</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative hidden sm:block" ref={notifRef}>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={openNotif}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[var(--live)] text-[10px] font-bold text-white flex items-center justify-center animate-pulse-live">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              {notifOpen && (
                <div className="absolute end-0 top-11 w-80 glass-strong border border-border/60 rounded-2xl shadow-elegant overflow-hidden z-50 animate-fade-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <span className="font-display font-semibold text-sm">{t("header_notif_title")}</span>
                    <Link to="/account" onClick={() => setNotifOpen(false)} className="text-xs text-primary-glow hover:underline">{t("header_notif_view_all")}</Link>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("header_notif_empty")}</div>
                  ) : (
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-smooth ${n.isRead ? "" : "bg-primary/5"}`}>
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight">{n.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                          </div>
                          {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex h-9 w-9 relative">
              <Link to="/favorites">
                <Heart className={`h-4 w-4 ${count > 0 ? "fill-red-500 text-red-500" : ""}`} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            </Button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="h-9 w-9 rounded-full flex items-center justify-center glass border border-border/40 hover:border-primary/40 transition-smooth overflow-hidden"
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute end-0 mt-2 w-52 glass-strong border border-border/60 rounded-xl shadow-elegant overflow-hidden z-50 animate-fade-up">
                    <div className="px-4 py-3 border-b border-border/40">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                      {isAdmin && (
                        <Link
                          to="/ops-x7k9m2"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-primary/10 text-primary transition-smooth"
                        >
                          <Shield className="h-4 w-4" /> {t("nav_admin_panel")}
                        </Link>
                      )}
                      <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-smooth">
                        <LogOut className="h-4 w-4" /> {t("nav_sign_out")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button asChild variant="ghost" size="icon" className="h-9 w-9">
                <Link to="/login"><User className="h-4 w-4" /></Link>
              </Button>
            )}

          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden glass-strong border-b border-border/40 max-h-[calc(100dvh-var(--header-h))] overflow-y-auto animate-fade-up">
          <nav className="mx-auto max-w-7xl px-3 py-3 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                {...("search" in l ? { search: l.search } : {})}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-smooth ${
                  navActive(l.to)
                    ? "bg-primary/15 text-primary-glow"
                    : "text-foreground hover:bg-secondary/40"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/favorites"
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-smooth ${
                navActive("/favorites")
                  ? "bg-primary/15 text-primary-glow"
                  : "text-foreground hover:bg-secondary/40"
              }`}
            >
              <Heart className={`h-4 w-4 ${count > 0 ? "fill-red-500 text-red-500" : ""}`} />
              {t("nav_favorites")}
              {count > 0 && (
                <span className="ms-auto h-5 min-w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
            <div className="pt-2 border-t border-border/40">
              <AppearanceDock className="w-full justify-center" />
            </div>
          </nav>
        </div>
      )}
    </header>
    <div className="header-spacer" aria-hidden="true" />
    </>
  );
}
