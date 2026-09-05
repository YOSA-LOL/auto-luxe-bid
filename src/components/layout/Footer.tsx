import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { useLanguage, type TranslationKey } from "@/lib/language";
import { useThemeMode } from "@/lib/theme-mode";

type FooterLink =
  | { labelKey: TranslationKey; to: "/browse" | "/auctions" }
  | { labelKey: TranslationKey; toastKey: TranslationKey };

type FooterColumn = {
  titleKey: TranslationKey;
  links: FooterLink[];
};

function FooterLinkItem({ link, className }: { link: FooterLink; className?: string }) {
  const { t } = useLanguage();
  if ("to" in link) {
    return (
      <Link to={link.to} className={className}>
        {t(link.labelKey)}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toast.info(t(link.toastKey))}
      className={`text-start ${className ?? ""}`}
    >
      {t(link.labelKey)}
    </button>
  );
}

function FooterColumns({ columns, compact }: { columns: FooterColumn[]; compact?: boolean }) {
  const { t } = useLanguage();
  const titleClass = compact
    ? "font-display font-semibold text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5"
    : "font-display font-semibold text-sm mb-3";
  const linkClass = compact
    ? "text-[10px] leading-snug text-muted-foreground hover:text-foreground transition-smooth block"
    : "text-sm text-muted-foreground hover:text-foreground transition-smooth";
  const listClass = compact ? "space-y-1" : "space-y-2";

  return (
    <>
      {columns.map((col) => (
        <div key={col.titleKey}>
          <h4 className={titleClass}>{t(col.titleKey)}</h4>
          <ul className={listClass}>
            {col.links.map((l) => (
              <li key={l.labelKey}>
                <FooterLinkItem link={l} className={linkClass} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function Footer() {
  const { t } = useLanguage();
  const { isLight } = useThemeMode();

  const FOOTER_LINKS: FooterColumn[] = [
    {
      titleKey: "footer_marketplace",
      links: [
        { labelKey: "footer_browse", to: "/browse" },
        { labelKey: "footer_auctions", to: "/auctions" },
        { labelKey: "footer_featured", to: "/browse" },
      ],
    },
    {
      titleKey: "footer_company",
      links: [
        { labelKey: "footer_about", toastKey: "footer_toast_about" },
        { labelKey: "footer_careers", toastKey: "footer_toast_careers" },
        { labelKey: "footer_press", toastKey: "footer_toast_press" },
        { labelKey: "footer_contact", toastKey: "footer_toast_contact" },
      ],
    },
    {
      titleKey: "footer_support",
      links: [
        { labelKey: "footer_help", toastKey: "footer_toast_help" },
        { labelKey: "footer_protection", toastKey: "footer_toast_protection" },
        { labelKey: "footer_verification", toastKey: "footer_toast_verification" },
        { labelKey: "footer_terms", toastKey: "footer_toast_terms" },
      ],
    },
  ];

  if (isLight) {
    return (
      <footer className="aether-footer border-t border-[#bac9cc]/30 mt-8 sm:mt-16 py-5 sm:py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          {/* Mobile: logo + 3 link cols in one row */}
          <div className="md:hidden space-y-3">
            <BrandLogo size="sm" linkToHome compact />
            <div className="grid grid-cols-3 gap-2">
              <FooterColumns columns={FOOTER_LINKS} compact />
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug pt-1 border-t border-[#bac9cc]/30">
              {t("footer_copy")}
            </p>
          </div>

          {/* Desktop */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col gap-4">
              <BrandLogo size="sm" linkToHome />
              <p className="text-sm text-muted-foreground mt-auto">{t("footer_copy")}</p>
            </div>
            {FOOTER_LINKS.map((col) => (
              <div key={col.titleKey} className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <FooterLinkItem
                    key={l.labelKey}
                    link={l}
                    className="text-sm text-muted-foreground hover:text-primary underline decoration-primary underline-offset-4 transition-colors"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border mt-8 sm:mt-16 relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent footer-neon-line" />
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Mobile: compact — logo row + 3 cols in one row + copyright */}
        <div className="md:hidden space-y-3">
          <BrandLogo size="sm" linkToHome compact />
          <div className="grid grid-cols-3 gap-2">
            <FooterColumns columns={FOOTER_LINKS} compact />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
            <span className="truncate">{t("footer_copy")}</span>
            <span className="shrink-0">{t("footer_crafted")}</span>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-3">
                <BrandLogo size="sm" linkToHome />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("footer_tagline")}
              </p>
            </div>
            <FooterColumns columns={FOOTER_LINKS} />
          </div>

          <div className="mt-6 pt-4 border-t border-border/40 text-xs text-muted-foreground flex justify-between">
            <span>{t("footer_copy")}</span>
            <span>{t("footer_crafted")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
