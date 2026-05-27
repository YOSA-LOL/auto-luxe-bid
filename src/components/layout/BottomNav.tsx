import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Gavel, Heart, User } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

const TABS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/browse", icon: Search, label: "Browse" },
  { to: "/auctions", icon: Gavel, label: "Auctions" },
  { to: "/favorites", icon: Heart, label: "Saved" },
  { to: "/admin", icon: User, label: "Account" },
] as const;

export function BottomNav() {
  const { count } = useFavorites();
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass-strong border-t border-border/40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {TABS.map((tab) => {
            const isActive = tab.to === "/" ? path === "/" : path.startsWith(tab.to);
            const isFav = tab.to === "/favorites";
            return (
              <Link
                key={tab.to}
                to={tab.to}
                {...(tab.to === "/browse" ? { search: { q: "" } } : {})}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-smooth min-w-[52px] ${
                  isActive
                    ? "text-primary-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 bg-primary/10 rounded-xl" />
                )}
                <span className="relative">
                  <tab.icon
                    className={`h-5 w-5 transition-smooth ${isActive ? "scale-110" : ""} ${isFav && count > 0 ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {isFav && count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-medium leading-none ${isActive ? "text-primary-glow" : ""}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
