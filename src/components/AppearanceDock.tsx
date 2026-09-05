import { Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";
import { useThemeMode } from "@/lib/theme-mode";
import { useLanguage } from "@/lib/language";

/** Neon (dark) ↔ Light — lives in the header toolbar */
export function AppearanceDock({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useThemeMode();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const pickDark = () => {
    if (!isLight) return;
    setTheme("dark");
    toast.info(t("theme_toggle_to_dark"), { duration: 2200 });
  };

  const pickLight = () => {
    if (isLight) return;
    setTheme("light");
    toast.info(t("theme_toggle_to_light"), { duration: 2200 });
  };

  return (
    <div
      className={`appearance-dock-track flex shrink-0 p-0.5 rounded-full border border-border/50 bg-background/60 backdrop-blur-md ${className}`}
      role="tablist"
      aria-label={t("appearance_dock_label")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isLight}
        title={t("perf_mode_neon")}
        onClick={pickDark}
        className={`flex items-center justify-center gap-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-smooth px-2.5 sm:px-3 py-1.5 sm:py-2 ${
          !isLight
            ? "bg-primary/15 text-primary-glow shadow-glow neon-pill border border-primary/25"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{t("perf_mode_neon")}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isLight}
        title={t("theme_light")}
        onClick={pickLight}
        className={`flex items-center justify-center gap-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-smooth px-2.5 sm:px-3 py-1.5 sm:py-2 ${
          isLight
            ? "bg-primary-container/25 text-primary border border-primary-container/40 shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sun className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">{t("theme_light")}</span>
      </button>
    </div>
  );
}
