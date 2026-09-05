import { Sparkles, Gauge } from "lucide-react";
import { toast } from "sonner";
import { usePerformanceMode } from "@/lib/performance-mode";
import { useLanguage } from "@/lib/language";

export function PerformanceModeToggle({ className = "" }: { className?: string }) {
  const { mode, toggle } = usePerformanceMode();
  const { t } = useLanguage();
  const isLite = mode === "lite";

  const handleToggle = () => {
    toggle();
    toast.info(isLite ? t("perf_toggle_neon") : t("perf_toggle_lite"), { duration: 2500 });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isLite ? t("perf_toggle_neon") : t("perf_toggle_lite")}
      aria-label={isLite ? t("perf_toggle_neon") : t("perf_toggle_lite")}
      aria-pressed={isLite}
      className={`group relative flex items-center gap-1.5 h-9 rounded-lg border transition-smooth px-2 md:px-2.5 ${
        isLite
          ? "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground hover:border-border"
          : "border-primary/40 bg-primary/10 text-primary-glow neon-pill hover:border-primary/60"
      } ${className}`}
    >
      {isLite ? (
        <Gauge className="h-4 w-4 shrink-0" />
      ) : (
        <Sparkles className="h-4 w-4 shrink-0" />
      )}
      <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-wider">
        {isLite ? t("perf_mode_lite") : t("perf_mode_neon")}
      </span>
    </button>
  );
}
