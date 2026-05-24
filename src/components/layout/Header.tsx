import { Link, useRouter } from "@tanstack/react-router";
import { Gavel, Search, User, Heart, Menu, LogOut, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { Route as RootRoute } from "@/routes/__root";
import { useState, useRef, useEffect } from "react";
import { useFavorites } from "@/lib/favorites";

export function Header() {
  const { user } = RootRoute.useRouteContext();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { count } = useFavorites();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.invalidate();
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass-strong border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow group-hover:scale-110 transition-smooth">
              <Gavel className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              APEX<span className="text-gradient-primary">Auto</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/browse", label: "Browse" },
              { to: "/auctions", label: "Live Auctions" },
              { to: "/admin", label: "Admin" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth rounded-md hover:bg-secondary/50"
                activeProps={{ className: "text-foreground bg-secondary/60" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Link to="/browse">
                <Search className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex relative">
              <Link to="/favorites">
                <Heart className={`h-4 w-4 ${count > 0 ? "fill-red-500 text-red-500" : ""}`} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
            </Button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-border/40 hover:border-primary/40 transition-smooth"
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-smooth ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 glass-strong border border-border/60 rounded-xl shadow-elegant overflow-hidden z-50 animate-fade-up">
                    <div className="px-4 py-3 border-b border-border/40">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/favorites"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-secondary/60 transition-smooth"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        My Favorites {count > 0 && <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{count}</span>}
                      </Link>
                      <Link
                        to="/list-your-car"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-secondary/60 transition-smooth"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Gavel className="h-4 w-4 text-muted-foreground" />
                        List Your Car
                      </Link>
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-secondary/60 transition-smooth"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Admin Panel
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-smooth"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button asChild variant="ghost" size="icon">
                <Link to="/login">
                  <User className="h-4 w-4" />
                </Link>
              </Button>
            )}

            <Button asChild className="hidden sm:inline-flex bg-gradient-primary shadow-glow border-0 text-primary-foreground hover:opacity-90">
              <Link to="/list-your-car">List Your Car</Link>
            </Button>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border/40 px-4 py-3 space-y-1">
            {[
              { to: "/browse", label: "Browse" },
              { to: "/auctions", label: "Live Auctions" },
              { to: "/favorites", label: `My Favorites${count > 0 ? ` (${count})` : ""}` },
              { to: "/admin", label: "Admin" },
              { to: "/list-your-car", label: "List Your Car" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 transition-smooth"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-smooth"
              >
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
