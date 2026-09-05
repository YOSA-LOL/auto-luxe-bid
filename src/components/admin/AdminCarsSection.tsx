import { useState } from "react";
import {
  Car as CarIcon, Star, Archive, Timer, Store,
} from "lucide-react";
import { useLanguage } from "@/lib/language";
import {
  AdminCarsInventoryPanel,
  AdminSoldCarsPanel,
  AdminExpiredCarsPanel,
} from "@/components/admin/AdminCarsInventoryPanel";
import { AdminHeroSpotlightPanel } from "@/components/admin/AdminHeroSpotlightPanel";
import type { AdminCarOption } from "@/lib/admin-tables.server";
import type { DbCar } from "@/lib/cars.server";

type CarsSubTab = "inventory" | "showroom" | "hero" | "sold" | "expired";

type CarRow = DbCar & { bids_count: number };

export type AdminCarsSectionProps = {
  now: number | null;
  refreshKey?: number;
  heroPinId: string;
  setHeroPinId: (id: string) => void;
  carPickerList: AdminCarOption[];
  carPickerLoading: boolean;
  savingHeroPin: boolean;
  onSaveHeroPin: (carId: string | null) => void;
  onToggleLive: (car: CarRow) => void;
  onMarkSold: (car: CarRow) => void;
  onMarkUnsold: (car: CarRow) => void;
  onContactWinner?: (car: CarRow) => void;
  onMarkNoSale?: (car: CarRow) => void;
  onResolveExpired?: (car: CarRow) => void;
  onRelist?: (car: CarRow) => void;
  onToggleVisibility: (car: CarRow) => void;
  onToggleFeatured: (car: CarRow) => void;
  onEdit: (car: CarRow) => void;
  onDeleteRequest: (carId: string) => void;
  deleteConfirmId: string | null;
  onDeleteConfirm: (carId: string, title: string) => void;
  onDeleteCancel: () => void;
};

export function AdminCarsSection({
  now,
  refreshKey = 0,
  heroPinId,
  setHeroPinId,
  carPickerList,
  carPickerLoading,
  savingHeroPin,
  onSaveHeroPin,
  onToggleLive,
  onMarkSold,
  onMarkUnsold,
  onContactWinner,
  onMarkNoSale,
  onResolveExpired,
  onRelist,
  onToggleVisibility,
  onToggleFeatured,
  onEdit,
  onDeleteRequest,
  deleteConfirmId,
  onDeleteConfirm,
  onDeleteCancel,
}: AdminCarsSectionProps) {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<CarsSubTab>("inventory");

  const subTabs: { id: CarsSubTab; label: string; icon: typeof CarIcon }[] = [
    { id: "inventory", label: t("admin_inventory"), icon: CarIcon },
    { id: "showroom", label: t("admin_showroom"), icon: Store },
    { id: "hero", label: t("admin_hero_spot"), icon: Star },
    { id: "sold", label: t("admin_sold_arch"), icon: Archive },
    { id: "expired", label: t("admin_expired_title"), icon: Timer },
  ];

  const tableProps = {
    now,
    refreshKey,
    onToggleLive,
    onMarkSold,
    onMarkUnsold,
    onToggleVisibility,
    onToggleFeatured,
    onEdit,
    onDeleteRequest,
    deleteConfirmId,
    onDeleteConfirm,
    onDeleteCancel,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide border-b border-border/30">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-smooth shrink-0 ${
              subTab === tab.id
                ? "bg-secondary text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "inventory" && (
        <AdminCarsInventoryPanel variant="inventory" {...tableProps} />
      )}
      {subTab === "showroom" && (
        <AdminCarsInventoryPanel variant="showroom" {...tableProps} />
      )}
      {subTab === "hero" && (
        <AdminHeroSpotlightPanel
          heroPinId={heroPinId}
          setHeroPinId={setHeroPinId}
          carPickerList={carPickerList}
          carPickerLoading={carPickerLoading}
          savingHeroPin={savingHeroPin}
          onSave={onSaveHeroPin}
        />
      )}
      {subTab === "sold" && <AdminSoldCarsPanel refreshKey={refreshKey} onMarkUnsold={onMarkUnsold} />}
      {subTab === "expired" && (
        <AdminExpiredCarsPanel
          refreshKey={refreshKey}
          onConfirmSale={onMarkSold}
          onMarkNoSale={onMarkNoSale}
          onContactWinner={onContactWinner}
          onResolve={onResolveExpired}
          onRelist={onRelist}
        />
      )}
    </div>
  );
}
