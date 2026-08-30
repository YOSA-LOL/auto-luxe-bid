import { Link } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { toast } from "sonner";
import { useLanguage, type TranslationKey } from "@/lib/language";

export function Footer() {
  const { t } = useLanguage();

  const FOOTER_LINKS = [
    {
      titleKey: "footer_marketplace" as TranslationKey,
      links: [
        { labelKey: "footer_browse" as TranslationKey, to: "/browse" as const },
        { labelKey: "footer_auctions" as TranslationKey, to: "/auctions" as const },
        { labelKey: "footer_featured" as TranslationKey, to: "/browse" as const },
      ],
    },
    {
      titleKey: "footer_company" as TranslationKey,
      links: [
        { labelKey: "footer_about" as TranslationKey, toast: "About page coming soon" },
        { labelKey: "footer_careers" as TranslationKey, toast: "Careers page coming soon" },
        { labelKey: "footer_press" as TranslationKey, toast: "Press kit coming soon" },
        { labelKey: "footer_contact" as TranslationKey, toast: "Contact us at: hello@apexauto.com" },
      ],
    },
    {
      titleKey: "footer_support" as TranslationKey,
      links: [
        { labelKey: "footer_help" as TranslationKey, toast: "Help center coming soon" },
        { labelKey: "footer_protection" as TranslationKey, toast: "All purchases include full buyer protection" },
        { labelKey: "footer_verification" as TranslationKey, toast: "All dealers are KYC-verified" },
        { labelKey: "footer_terms" as TranslationKey, toast: "Terms of service available on request" },
      ],
    },
  ];

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
              {t("footer_tagline")}
            </p>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.titleKey}>
              <h4 className="font-display font-semibold text-sm mb-3">{t(col.titleKey)}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.labelKey}>
                    {"to" in l ? (
                      <Link
                        to={l.to}
                        className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                      >
                        {t(l.labelKey)}
                      </Link>
                    ) : (
                      <button
                        onClick={() => toast.info(l.toast)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-smooth text-start"
                      >
                        {t(l.labelKey)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 text-xs text-muted-foreground flex justify-between">
          <span>{t("footer_copy")}</span>
          <span>{t("footer_crafted")}</span>
        </div>
      </div>
    </footer>
  );
}
