import { Link } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { toast } from "sonner";

const FOOTER_LINKS = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse", to: "/browse" as const },
      { label: "Live Auctions", to: "/auctions" as const },
      { label: "Featured", to: "/browse" as const },
      { label: "List Your Car", to: "/list-your-car" as const },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", toast: "About page coming soon" },
      { label: "Careers", toast: "Careers page coming soon" },
      { label: "Press", toast: "Press kit coming soon" },
      { label: "Contact", toast: "Contact us at: hello@apexauto.com" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", toast: "Help center coming soon" },
      { label: "Buyer Protection", toast: "All purchases include full buyer protection" },
      { label: "Verification", toast: "All dealers are KYC-verified" },
      { label: "Terms", toast: "Terms of service available on request" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3 w-fit">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Gavel className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">APEX<span className="text-gradient-primary">Auto</span></span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The premium marketplace for used-car auctions. Verified dealers, live bidding, secure payments.
            </p>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-semibold text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"to" in l ? (
                      <Link
                        to={l.to}
                        className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => toast.info(l.toast)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-smooth text-left"
                      >
                        {l.label}
                      </button>
                    )}
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
