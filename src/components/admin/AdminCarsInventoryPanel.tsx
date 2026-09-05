import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Star, Trash2, Edit2, Radio, DollarSign, Timer,
  ChevronDown, ChevronUp, Search, Loader2, Eye, EyeOff, RotateCcw, Car, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { queryAdminCars, queryAdminCarBrands, queryAdminSoldCars, queryAdminExpired } from "@/lib/admin-tables.server";
import { useAdminList } from "@/lib/use-admin-list";
import { formatPrice, formatNumber } from "@/lib/mock-data";
import { useLanguage } from "@/lib/language";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import type { DbCar } from "@/lib/cars.server";

type CarRow = DbCar & { bids_count: number };

function carIsHidden(c: CarRow) {
  return c.is_visible === false || (c.is_visible as unknown) === 0;
}

function carThumbUrl(c: CarRow): string | null {
  return c.image_url || (Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : null);
}

function CarStatusDot({ car }: { car: CarRow }) {
  const { t } = useLanguage();
  const dot = (color: string, pulse?: boolean) => (
    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${color} ${pulse ? "animate-pulse" : ""}`} />
  );
  if (car.is_sold) {
    return <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-destructive">{dot("bg-destructive")}{t("admin_status_sold")}</span>;
  }
  if (car.is_live) {
    return <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-[var(--live)]">{dot("bg-[var(--live)]", true)}{t("admin_status_live")}</span>;
  }
  if (carIsHidden(car)) {
    return <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-muted-foreground">{dot("bg-muted-foreground/50")}{t("admin_status_hidden")}</span>;
  }
  return <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-muted-foreground">{dot("bg-primary/60")}{t("admin_status_listed")}</span>;
}

function CarDetailsGrid({ car: c }: { car: CarRow }) {
  const { t } = useLanguage();
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: t("admin_lbl_engine"), value: c.engine ?? "—" },
    { label: t("admin_lbl_hp"), value: c.hp ?? "—" },
    { label: t("admin_lbl_drivetrain"), value: c.drivetrain ?? "—" },
    { label: t("admin_lbl_fuel"), value: c.fuel },
    { label: t("admin_lbl_transmission"), value: c.transmission },
    { label: t("admin_lbl_mileage"), value: `${formatNumber(c.mileage)} km` },
    { label: t("admin_lbl_vin"), value: c.vin ?? "—" },
    { label: t("admin_lbl_plate"), value: c.plate_status ?? "—" },
    { label: t("admin_lbl_accidents"), value: c.accident_history ? t("admin_csv_yes") : t("admin_csv_no") },
    { label: t("admin_lbl_paint"), value: c.paint_condition ?? "—" },
    { label: t("admin_lbl_tires"), value: c.tire_condition ?? "—" },
    { label: t("admin_lbl_service"), value: c.service_history ?? "—" },
    { label: t("admin_lbl_min_raise"), value: formatPrice(c.min_raise ?? 10000) },
    { label: t("admin_lbl_reserve"), value: c.reserve_price ? formatPrice(c.reserve_price) : t("common_none") },
    { label: t("admin_sec_gallery"), value: (c.images ?? []).length },
    { label: t("admin_tbl_city"), value: c.city },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5">
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-[8px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="text-[10px] font-medium text-foreground break-words leading-tight">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AdminCarMobileRow({
  car: c,
  now,
  expanded,
  onToggleExpand,
  deleteConfirmId,
  onToggleLive,
  onMarkSold,
  onMarkUnsold,
  onToggleVisibility,
  onToggleFeatured,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  car: CarRow;
  now: number | null;
  expanded: boolean;
  onToggleExpand: () => void;
  deleteConfirmId: string | null;
  onToggleLive: (car: CarRow) => void;
  onMarkSold: (car: CarRow) => void;
  onMarkUnsold: (car: CarRow) => void;
  onToggleVisibility: (car: CarRow) => void;
  onToggleFeatured: (car: CarRow) => void;
  onEdit: (car: CarRow) => void;
  onDeleteRequest: (carId: string) => void;
  onDeleteConfirm: (carId: string, title: string) => void;
  onDeleteCancel: () => void;
}) {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const thumb = carThumbUrl(c);
  const price = c.is_live ? (c.current_bid ?? c.price) : c.price;
  const iconBtn = "h-6 w-6 shrink-0 rounded p-0 touch-manipulation";

  return (
    <article className={`border-b border-border/60 last:border-b-0 ${expanded ? "bg-secondary/10" : "even:bg-secondary/[0.04]"}`}>
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-start touch-manipulation px-2 py-1.5"
        aria-expanded={expanded}
      >
        <div className="flex gap-2 items-center">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-border/30 bg-secondary/20">
            {thumb && !imgError ? (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Car className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            )}
            {c.featured && (
              <Star className="absolute top-0 end-0 h-2 w-2 fill-yellow-400 text-yellow-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p dir="auto" className="flex-1 text-[11px] font-semibold leading-tight line-clamp-1 text-foreground">
                {c.title}
              </p>
              <span className="shrink-0 max-w-[42%] truncate text-[10px] font-bold tabular-nums text-primary-glow">
                {formatPrice(price, c.currency)}
              </span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
            <div className="mt-0.5 flex items-center gap-1 overflow-hidden text-[9px] text-muted-foreground">
              <CarStatusDot car={c} />
              <span className="opacity-30">·</span>
              <span className="shrink-0">{c.year}</span>
              <span className="opacity-30">·</span>
              <span className="truncate">{c.city}</span>
              {c.ends_at && now && !c.is_sold && (
                <>
                  <span className="opacity-30">·</span>
                  <span className={`inline-flex shrink-0 items-center gap-0.5 ${c.ends_at < now ? "text-destructive" : ""}`}>
                    <Timer className="h-2 w-2" />
                    {c.ends_at < now ? t("admin_ended") : `${Math.round((c.ends_at - now) / 60000)}m`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-0 px-1 pb-1" onClick={(e) => e.stopPropagation()}>
        {c.is_sold ? (
          <Button variant="outline" size="sm" className="h-6 flex-1 text-[10px] px-2 glass" onClick={() => onMarkUnsold(c)}>
            <RotateCcw className="h-3 w-3 me-1" /> {t("admin_mark_unsold")}
          </Button>
        ) : (
          <>
            <Button
              variant={c.is_live ? "default" : "outline"}
              size="icon"
              className={`${iconBtn} ${c.is_live ? "bg-[var(--live)] hover:bg-[var(--live)]/90 text-white border-0" : ""}`}
              title={c.is_live ? t("admin_unlist") : t("admin_go_live")}
              onClick={() => onToggleLive(c)}
            >
              <Radio className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className={iconBtn} title={t("admin_mark_sold")} onClick={() => onMarkSold(c)}>
              <DollarSign className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={iconBtn}
              title={carIsHidden(c) ? t("admin_toggle_show") : t("admin_toggle_hide")}
              onClick={() => onToggleVisibility(c)}
            >
              {carIsHidden(c) ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className={iconBtn} title={c.featured ? t("admin_unfeature") : t("admin_feature")} onClick={() => onToggleFeatured(c)}>
              <Star className={`h-3 w-3 ${c.featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="ghost" size="icon" className={iconBtn} title={t("admin_action_edit")} onClick={() => onEdit(c)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className={`${iconBtn} text-destructive hover:text-destructive`} title={t("admin_action_delete")} onClick={() => onDeleteRequest(c.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button asChild variant="ghost" size="icon" className={iconBtn} title={t("admin_view_listing")}>
              <Link to="/cars/$carId" params={{ carId: c.id }}>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border/20 bg-secondary/5 px-2 py-2 space-y-2">
          <CarDetailsGrid car={c} />
          <div className="flex gap-1.5 pt-1 border-t border-border/15">
            <Button asChild size="sm" variant="outline" className="glass text-[10px] h-7 flex-1">
              <Link to="/cars/$carId" params={{ carId: c.id }}>{t("admin_view_listing")}</Link>
            </Button>
            <Button size="sm" variant="outline" className="glass text-[10px] h-7 flex-1" onClick={() => onEdit(c)}>
              <Edit2 className="h-3 w-3 me-1" /> {t("admin_action_edit")}
            </Button>
          </div>
        </div>
      )}

      {deleteConfirmId === c.id && (
        <div className="border-t border-destructive/30 bg-destructive/5 px-2 py-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <p className="flex-1 text-[9px] font-medium leading-tight line-clamp-2">{t("admin_delete_confirm").replace("{title}", c.title)}</p>
          <Button size="sm" variant="destructive" className="h-6 px-1.5 text-[9px]" onClick={() => onDeleteConfirm(c.id, c.title)}>
            {t("admin_action_delete")}
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-1.5 text-[9px]" onClick={onDeleteCancel}>
            {t("admin_cancel")}
          </Button>
        </div>
      )}
    </article>
  );
}

function CarStatusBadge({ car }: { car: CarRow }) {
  const { t } = useLanguage();
  if (car.is_sold) {
    return <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{t("admin_status_sold")}</Badge>;
  }
  if (car.is_live) {
    return (
      <Badge className="bg-[var(--live)] text-white border-0 gap-0.5 text-[10px] px-1.5 py-0.5">
        <Radio className="h-2.5 w-2.5" /> {t("admin_status_live")}
      </Badge>
    );
  }
  if (carIsHidden(car)) {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">{t("admin_status_hidden")}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{t("admin_status_listed")}</Badge>;
}

export type AdminCarsInventoryPanelProps = {
  variant?: "inventory" | "showroom";
  now: number | null;
  refreshKey?: number;
  onToggleLive: (car: CarRow) => void;
  onMarkSold: (car: CarRow) => void;
  onMarkUnsold: (car: CarRow) => void;
  onToggleVisibility: (car: CarRow) => void;
  onToggleFeatured: (car: CarRow) => void;
  onEdit: (car: CarRow) => void;
  onDeleteRequest: (carId: string) => void;
  deleteConfirmId: string | null;
  onDeleteConfirm: (carId: string, title: string) => void;
  onDeleteCancel: () => void;
};

export function AdminCarsInventoryPanel({
  variant = "inventory",
  now,
  refreshKey = 0,
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
}: AdminCarsInventoryPanelProps) {
  const { t } = useLanguage();
  const [brands, setBrands] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isShowroom = variant === "showroom";
  const list = useAdminList<CarRow>(
    (q) => queryAdminCars({ data: q }),
    { initialPageSize: 20, initialStatus: isShowroom ? "showroom" : "" },
  );

  useEffect(() => {
    queryAdminCarBrands().then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    if (refreshKey > 0) list.reload();
  }, [refreshKey, list.reload]);

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-card border border-border/60 p-3 sm:p-6 min-h-0 sm:min-h-[calc(100vh-14rem)]">
      <div className="flex flex-col gap-2 mb-3 shrink-0">
        <div>
          <h3 className="font-display font-semibold text-base sm:text-lg">
            {isShowroom ? t("admin_showroom") : t("admin_inventory")}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isShowroom ? t("admin_showroom_sub") : t("admin_inventory_sub")}
            {!list.loading && ` · ${list.total.toLocaleString()} ${t("admin_total")}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <div className="relative col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[140px] sm:max-w-[200px]">
            <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder={t("admin_search_cars")}
              className="h-7 ps-7 text-[11px] glass"
            />
          </div>
          <select
            value={list.brand}
            onChange={(e) => list.setBrand(e.target.value)}
            className="h-7 rounded-lg border border-border/60 bg-background/60 px-2 text-[11px] min-w-0"
          >
            <option value="">{t("admin_all_brands")}</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          {!isShowroom ? (
            <select
              value={list.status}
              onChange={(e) => list.setStatus(e.target.value)}
              className="h-7 rounded-lg border border-border/60 bg-background/60 px-2 text-[11px] min-w-0"
            >
              <option value="">{t("admin_all_status")}</option>
              <option value="live">{t("admin_status_live")}</option>
              <option value="listed">{t("admin_status_listed")}</option>
              <option value="hidden">{t("admin_status_hidden")}</option>
              <option value="sold">{t("admin_status_sold")}</option>
            </select>
          ) : (
            <Badge variant="outline" className="h-7 px-2 text-[10px] justify-center">{t("admin_status_listed")}</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
      {list.error && (
        <p className="text-sm text-destructive text-center py-8">{list.error}</p>
      )}

      {!list.error && list.loading && list.rows.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!list.error && !list.loading && list.rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">No cars match your filters.</p>
      )}

      {!list.error && list.rows.length > 0 && (
        <>
          {/* Mobile — structured cards with expand */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-card/20">
            {list.rows.map((c) => (
              <AdminCarMobileRow
                key={c.id}
                car={c}
                now={now}
                expanded={expandedId === c.id}
                onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                deleteConfirmId={deleteConfirmId}
                onToggleLive={onToggleLive}
                onMarkSold={onMarkSold}
                onMarkUnsold={onMarkUnsold}
                onToggleVisibility={onToggleVisibility}
                onToggleFeatured={onToggleFeatured}
                onEdit={onEdit}
                onDeleteRequest={onDeleteRequest}
                onDeleteConfirm={onDeleteConfirm}
                onDeleteCancel={onDeleteCancel}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block flex-1 min-h-[420px] overflow-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_car")}</th>
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_status")}</th>
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_auction_ends")}</th>
                  <th className="pb-3 pe-4 text-end">{t("admin_tbl_price")}</th>
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_city")}</th>
                  <th className="pb-3 text-end">{t("admin_tbl_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr
                      className="border-t border-border/20 hover:bg-secondary/20 transition-smooth cursor-pointer"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <td className="py-3 pe-4 text-start">
                        <div className="flex items-center gap-2">
                          {c.featured && <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />}
                          <div>
                            <div className="font-medium">{c.title}</div>
                            <div className="text-[11px] text-muted-foreground">{c.city} · {c.year}{c.trim ? ` · ${c.trim}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pe-4 text-start">
                        <CarStatusBadge car={c} />
                      </td>
                      <td className="py-3 pe-4 text-start">
                        {c.ends_at && now && !c.is_sold ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Timer className="h-3 w-3 text-muted-foreground" />
                            <span className={c.ends_at < now ? "text-destructive" : "text-muted-foreground"}>
                              {c.ends_at < now ? t("admin_ended") : `${Math.round((c.ends_at - now) / 60000)}m`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="py-3 pe-4 text-end font-display font-semibold tabular-nums">
                        {formatPrice(c.is_live ? (c.current_bid ?? c.price) : c.price)}
                      </td>
                      <td className="py-3 pe-4 text-start text-muted-foreground text-xs">{c.city}</td>
                      <td className="py-3 text-end relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {c.is_sold ? (
                            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => onMarkUnsold(c)}>
                              <RotateCcw className="h-3.5 w-3.5" /> {t("admin_mark_unsold")}
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onToggleLive(c)}>
                                {c.is_live ? t("admin_unlist") : t("admin_go_live")}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => onMarkSold(c)} title={t("admin_mark_sold")}>
                                <DollarSign className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={carIsHidden(c) ? t("admin_toggle_show") : t("admin_toggle_hide")} onClick={() => onToggleVisibility(c)}>
                                {carIsHidden(c) ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={c.featured ? t("admin_unfeature") : t("admin_feature")} onClick={() => onToggleFeatured(c)}>
                            <Star className={`h-3.5 w-3.5 ${c.featured ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteRequest(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        {deleteConfirmId === c.id && (
                          <div className="absolute end-0 mt-1 w-60 glass-strong border border-destructive/40 rounded-xl shadow-elegant z-20 p-3 text-start" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm font-medium mb-1">{t("admin_delete_confirm").replace("{title}", c.title)}</p>
                            <p className="text-xs text-muted-foreground mb-3">{t("admin_delete_warn")}</p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="destructive" className="flex-1" onClick={() => onDeleteConfirm(c.id, c.title)}>{t("admin_action_delete")}</Button>
                              <Button size="sm" variant="outline" className="glass" onClick={onDeleteCancel}>{t("admin_cancel")}</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr className="bg-secondary/10">
                        <td colSpan={6} className="py-3 px-4">
                          <CarDetailsGrid car={c} />
                          <div className="flex gap-2 mt-3">
                            <Button asChild size="sm" variant="outline" className="glass text-xs h-7">
                              <Link to="/cars/$carId" params={{ carId: c.id }}>{t("admin_view_listing")}</Link>
                            </Button>
                            <Button size="sm" variant="outline" className="glass text-xs h-7" onClick={() => onEdit(c)}>
                              <Edit2 className="h-3 w-3 mr-1" /> {t("admin_action_edit")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <AdminTablePagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            loading={list.loading}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        </>
      )}
      </div>
    </div>
  );
}

export function AdminSoldCarsPanel({ refreshKey = 0, onMarkUnsold }: { refreshKey?: number; onMarkUnsold: (car: CarRow) => void }) {
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const list = useAdminList<CarRow>((q) => queryAdminSoldCars({ data: q }), { initialPageSize: 20 });

  useEffect(() => {
    if (refreshKey > 0) list.reload();
  }, [refreshKey, list.reload]);

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-card border border-border/60 p-4 sm:p-6 min-h-[calc(100vh-14rem)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display font-semibold text-lg">{t("admin_sold_arch")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("admin_sold_sub")}</p>
        </div>
        <Badge variant="outline">{list.total} sold</Badge>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          placeholder={t("admin_search_cars")}
          className="h-8 ps-8 text-xs glass"
        />
      </div>

      {list.error && <p className="text-sm text-destructive text-center py-6">{list.error}</p>}

      {!list.error && list.rows.length === 0 && !list.loading && (
        <p className="text-sm text-muted-foreground py-6 text-center">{t("admin_no_sold")}</p>
      )}

      {!list.error && list.rows.length > 0 && (
        <>
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-card/20">
            {list.rows.map((c) => {
              const thumb = carThumbUrl(c);
              const expanded = expandedId === c.id;
              return (
                <article key={c.id} className={`border-b border-border/60 last:border-b-0 ${expanded ? "bg-secondary/10" : "even:bg-secondary/[0.04]"}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                    className="w-full text-start touch-manipulation px-2 py-1.5"
                    aria-expanded={expanded}
                  >
                    <div className="flex gap-2 items-center">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-border/30 bg-secondary/20">
                        {thumb ? (
                          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Car className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p dir="auto" className="flex-1 text-[11px] font-semibold leading-tight line-clamp-1">{c.title}</p>
                          <span className="shrink-0 max-w-[42%] truncate text-[10px] font-bold tabular-nums text-primary-glow">
                            {formatPrice(c.current_bid ?? c.price, c.currency)}
                          </span>
                          <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </div>
                        <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                          {c.brand} · {c.year} · {c.city}
                          {c.sold_at ? ` · ${new Date(c.sold_at as unknown as string).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="px-1 pb-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="h-6 w-full text-[10px] px-2 glass" onClick={() => onMarkUnsold(c)}>
                      <RotateCcw className="h-3 w-3 me-1" /> {t("admin_mark_unsold")}
                    </Button>
                  </div>
                  {expanded && (
                    <div className="border-t border-border/20 bg-secondary/5 px-2 py-2 space-y-2">
                      <CarDetailsGrid car={c} />
                      <Button asChild size="sm" variant="outline" className="glass text-[10px] h-7 w-full">
                        <Link to="/cars/$carId" params={{ carId: c.id }}>{t("admin_view_listing")}</Link>
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="hidden md:block flex-1 min-h-[420px] overflow-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_car")}</th>
                  <th className="pb-3 pe-4 text-start">Sold Date</th>
                  <th className="pb-3 pe-4 text-end">Starting Price</th>
                  <th className="pb-3 pe-4 text-end">Final Price</th>
                  <th className="pb-3 text-end">{t("admin_tbl_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((c) => (
                  <tr key={c.id} className="border-t border-border/20 hover:bg-secondary/20 transition-smooth">
                    <td className="py-3 pe-4 text-start">
                      <Link to="/cars/$carId" params={{ carId: c.id }} className="font-medium hover:text-primary-glow transition-smooth block">{c.title}</Link>
                      <div className="text-[11px] text-muted-foreground">{c.brand} · {c.year} · {c.city}</div>
                    </td>
                    <td className="py-3 pe-4 text-start text-xs text-muted-foreground">
                      {c.sold_at ? new Date(c.sold_at as unknown as string).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 pe-4 text-end font-display tabular-nums text-xs text-muted-foreground">{formatPrice(c.price)}</td>
                    <td className="py-3 text-end font-display font-semibold tabular-nums text-gradient-primary">
                      {formatPrice(c.current_bid ?? c.price)}
                    </td>
                    <td className="py-3 text-end">
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => onMarkUnsold(c)}>
                        <RotateCcw className="h-3.5 w-3.5" /> {t("admin_mark_unsold")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminTablePagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            loading={list.loading}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        </>
      )}
    </div>
  );
}

export function AdminExpiredCarsPanel({
  refreshKey = 0,
  onConfirmSale,
  onMarkNoSale,
  onContactWinner,
  onResolve,
  onRelist,
}: {
  refreshKey?: number;
  onConfirmSale?: (car: CarRow) => void;
  onMarkNoSale?: (car: CarRow) => void;
  onContactWinner?: (car: CarRow) => void;
  onResolve?: (car: CarRow) => void;
  onRelist?: (car: CarRow) => void;
}) {
  const { t } = useLanguage();
  const list = useAdminList<CarRow & { reserve_met?: boolean }>((q) => queryAdminExpired({ data: q }), { initialPageSize: 20 });

  useEffect(() => {
    if (refreshKey > 0) list.reload();
  }, [refreshKey, list.reload]);

  const statusLabel = (c: CarRow) => {
    if (c.auction_status === "ended_with_winner") return t("admin_status_winner");
    if (c.auction_status === "no_sale") return t("admin_status_no_sale");
    return t("admin_ended");
  };

  const actionButtons = (c: CarRow) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {c.auction_status === "ended_with_winner" && c.winner_email && (
        <>
          <Button size="sm" variant="outline" className="glass text-xs h-8" onClick={() => onContactWinner?.(c)}>
            {t("admin_contact_winner")}
          </Button>
          <Button size="sm" className="bg-gradient-primary border-0 text-primary-foreground text-xs h-8" onClick={() => onConfirmSale?.(c)}>
            {t("admin_confirm_sale")}
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8 text-destructive" onClick={() => onMarkNoSale?.(c)}>
            {t("admin_mark_no_sale")}
          </Button>
        </>
      )}
      {c.auction_status === "no_sale" && (
        <Button size="sm" variant="outline" className="glass text-xs h-8" onClick={() => onRelist?.(c)}>
          {t("admin_relist")}
        </Button>
      )}
      {(c.auction_status === "ended" || !c.auction_status || c.auction_status === "none") && (
        <Button size="sm" variant="outline" className="glass text-xs h-8" onClick={() => onResolve?.(c)}>
          {t("admin_resolve_auction")}
        </Button>
      )}
      <Button asChild size="sm" variant="ghost" className="text-xs h-8">
        <Link to="/cars/$carId" params={{ carId: c.id }}>{t("admin_view_listing")}</Link>
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-card border border-border/60 p-4 sm:p-6 min-h-[calc(100vh-14rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg">{t("admin_expired_title")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("admin_expired_sub")}</p>
        </div>
        <Badge variant="outline">{list.total} {t("admin_total")}</Badge>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          placeholder={t("admin_search_cars")}
          className="h-9 ps-8 text-sm glass"
        />
      </div>

      {list.error && <p className="text-sm text-destructive text-center py-6">{list.error}</p>}
      {!list.error && list.rows.length === 0 && !list.loading && (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("admin_no_expired")}</p>
      )}

      {!list.error && list.rows.length > 0 && (
        <>
          <div className="md:hidden space-y-2 mb-4">
            {list.rows.map((c) => (
              <div key={c.id} className="rounded-xl border border-border/50 bg-secondary/10 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{c.title}</div>
                    <div className="text-[11px] text-muted-foreground">{c.brand} · {c.year}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{statusLabel(c)}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.winner_name || c.winner_email
                    ? `${t("admin_winner")}: ${c.winner_name ?? ""} ${c.winner_email ? `(${c.winner_email})` : ""}`
                    : t("admin_no_winner")}
                </div>
                <div className="font-display font-semibold text-sm">{formatPrice(c.current_bid ?? c.price)}</div>
                {actionButtons(c)}
              </div>
            ))}
          </div>
          <div className="hidden md:block flex-1 min-h-[420px] overflow-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 bg-gradient-card z-10">
                <tr className="text-start text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_car")}</th>
                  <th className="pb-3 pe-4 text-start">{t("admin_tbl_status")}</th>
                  <th className="pb-3 pe-4 text-start">{t("admin_winner")}</th>
                  <th className="pb-3 pe-4 text-end">{t("admin_tbl_price")}</th>
                  <th className="pb-3 text-end">{t("admin_tbl_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((c) => (
                  <tr key={c.id} className="border-t border-border/20 hover:bg-secondary/20 transition-smooth">
                    <td className="py-3 pe-4 text-start">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">{c.brand} · {c.year}</div>
                    </td>
                    <td className="py-3 pe-4 text-start">
                      <Badge variant="outline">{statusLabel(c)}</Badge>
                    </td>
                    <td className="py-3 pe-4 text-start text-xs">
                      {c.winner_name || c.winner_email ? (
                        <div>
                          <div className="font-medium">{c.winner_name}</div>
                          <div className="text-muted-foreground">{c.winner_email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t("admin_no_winner")}</span>
                      )}
                    </td>
                    <td className="py-3 pe-4 text-end font-display font-semibold tabular-nums">
                      {formatPrice(c.current_bid ?? c.price)}
                    </td>
                    <td className="py-3 text-end">{actionButtons(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminTablePagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            loading={list.loading}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
          />
        </>
      )}
    </div>
  );
}
