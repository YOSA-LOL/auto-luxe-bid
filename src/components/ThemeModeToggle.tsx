import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useThemeMode } from "@/lib/theme-mode";
import { useLanguage } from "@/lib/language";

export function ThemeModeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useThemeMode();
  const { t } = useLanguage();
  const isLight = theme === "light";

  const handleToggle = () => {
    toggle();
    toast.info(isLight ? t("theme_toggle_to_dark") : t("theme_toggle_to_light"), { duration: 2500 });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isLight ? t("theme_toggle_to_dark") : t("theme_toggle_to_light")}
      aria-label={isLight ? t("theme_toggle_to_dark") : t("theme_toggle_to_light")}
      aria-pressed={isLight}
      className={`flex items-center justify-center h-9 w-9 rounded-lg border transition-smooth ${
        isLight
          ? "border-border bg-secondary text-primary hover:border-primary/50"
          : "glass border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40"
      } ${className}`}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
