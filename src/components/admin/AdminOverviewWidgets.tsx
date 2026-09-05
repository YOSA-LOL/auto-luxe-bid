import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getAdminDashboardCounts, type AdminDashboardCounts } from "@/lib/admin-tables.server";
import { useLanguage } from "@/lib/language";

export function AdminBrandBreakdown() {
  const { t } = useLanguage();
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);

  useEffect(() => {
    getAdminDashboardCounts().then(setCounts).catch(() => {});
  }, []);

  if (!counts?.brands.length) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground text-center">
        No brand data yet.
      </div>
    );
  }

  const max = counts.brands[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm">{t("admin_breakdown")}</h3>
          <p className="text-[10px] text-muted-foreground">{t("admin_by_brand")}</p>
        </div>
        <TrendingUp className="h-4 w-4 text-primary-glow" />
      </div>
      <div className="space-y-2">
        {counts.brands.map(({ brand, count }) => (
          <div key={brand} className="flex items-center gap-2">
            <div className="w-20 text-[10px] font-medium truncate text-end shrink-0">{brand}</div>
            <div className="flex-1 h-5 rounded-full bg-secondary/40 overflow-hidden">
              <div
                className="h-full bg-gradient-primary rounded-full transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <div className="w-8 text-[10px] text-muted-foreground text-end tabular-nums">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function useAdminDashboardCounts() {
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboardCounts()
      .then(setCounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { counts, loading };
}
