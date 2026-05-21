import { Gavel } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Gavel className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">APEX<span className="text-gradient-primary">Auto</span></span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              The premium marketplace for used-car auctions. Verified dealers, live bidding, secure payments.
            </p>
          </div>
          {[
            { title: "Marketplace", links: ["Browse", "Live Auctions", "Featured", "Dealerships"] },
            { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
            { title: "Support", links: ["Help Center", "Buyer Protection", "Verification", "Terms"] },
          ].map((c) => (
            <div key={c.title}>
              <h4 className="font-display font-semibold text-sm mb-3">{c.title}</h4>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border/40 text-xs text-muted-foreground flex justify-between">
          <span>© 2026 APEXAuto. All rights reserved.</span>
          <span>Crafted for collectors.</span>
        </div>
      </div>
    </footer>
  );
}
