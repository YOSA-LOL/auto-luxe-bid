import { Link } from "@tanstack/react-router";
import { Gavel, Search, User, Heart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
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
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
            </Button>
            <Button className="hidden sm:inline-flex bg-gradient-primary shadow-glow border-0 text-primary-foreground hover:opacity-90">
              List Your Car
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
