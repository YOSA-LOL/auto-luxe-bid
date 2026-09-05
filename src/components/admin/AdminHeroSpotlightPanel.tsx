import { Star, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/mock-data";
import { useLanguage } from "@/lib/language";
import type { AdminCarOption } from "@/lib/admin-tables.server";

export type AdminHeroSpotlightPanelProps = {
  heroPinId: string;
  setHeroPinId: (id: string) => void;
  carPickerList: AdminCarOption[];
  carPickerLoading: boolean;
  savingHeroPin: boolean;
  onSave: (carId: string | null) => void;
};

export function AdminHeroSpotlightPanel({
  heroPinId,
  setHeroPinId,
  carPickerList,
  carPickerLoading,
  savingHeroPin,
  onSave,
}: AdminHeroSpotlightPanelProps) {
  const { t } = useLanguage();
  const pinned = heroPinId ? carPickerList.find((c) => c.id === heroPinId) : null;
  const autoPick = carPickerList.find((c) => Boolean(c.is_live) && !Boolean(c.is_sold))
    ?? carPickerList.find((c) => Boolean(c.is_live))
    ?? carPickerList[0];

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-card border border-border/60 p-4 sm:p-6 min-h-[calc(100vh-14rem)]">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h3 className="font-display font-semibold text-lg flex items-center gap-2">
            <Star className="h-4 w-4 text-primary-glow" />
            {t("admin_hero_spot")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t("admin_hero_sub")}</p>
        </div>
        {heroPinId && (
          <Badge className="bg-primary/20 text-primary-glow border-primary/30 shrink-0">{t("admin_pinned")}</Badge>
        )}
      </div>

      <div className="flex-1 max-w-3xl space-y-6">
        {pinned ? (
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-secondary/40 border border-primary/20">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-primary-glow mb-1">{t("admin_pinned")}</div>
              <div className="font-display font-semibold text-lg truncate">{pinned.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{pinned.brand} · {pinned.year} · EGP {formatNumber(pinned.current_bid ?? pinned.price)}</div>
              {Boolean(pinned.is_live) && (
                <Badge className="mt-2 bg-[var(--live)] text-white border-0 text-xs px-2 py-0.5 gap-1">
                  <Radio className="h-3 w-3" /> {t("admin_status_live")}
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" className="glass shrink-0" disabled={savingHeroPin} onClick={() => onSave(null)}>
              <X className="h-3.5 w-3.5 me-1" /> {t("admin_hero_clear")}
            </Button>
          </div>
        ) : autoPick ? (
          <div className="p-5 rounded-2xl bg-secondary/20 border border-border/40">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Auto-selected</div>
            <div className="font-display font-semibold text-lg">{autoPick.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{autoPick.brand} · {autoPick.year}</div>
          </div>
        ) : carPickerLoading ? (
          <p className="text-sm text-muted-foreground">Loading car list…</p>
        ) : null}

        <div className="space-y-3">
          <label className="text-sm font-medium block">{t("admin_hero_pin")}</label>
          <select
            value={heroPinId}
            onChange={(e) => setHeroPinId(e.target.value)}
            disabled={carPickerLoading}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          >
            <option value="">{t("admin_hero_auto")}</option>
            {[...carPickerList]
              .sort((a, b) => {
                if (Boolean(a.is_live) !== Boolean(b.is_live)) return Boolean(a.is_live) ? -1 : 1;
                return a.title.localeCompare(b.title);
              })
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {Boolean(c.is_live) ? "🔴 " : ""}{c.title} · {c.year} · EGP {formatNumber(c.current_bid ?? c.price)}
                </option>
              ))}
          </select>
          <Button
            className="bg-gradient-primary border-0 text-primary-foreground h-10 px-6"
            disabled={savingHeroPin || carPickerLoading}
            onClick={() => onSave(heroPinId || null)}
          >
            {savingHeroPin ? "…" : t("admin_hero_save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
