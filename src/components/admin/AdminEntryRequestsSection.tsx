import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Eye, Search, Settings2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { queryAdminEntryRequests } from "@/lib/admin-tables.server";
import {
  updateAuctionEntryStatus,
  updateAuctionDepositSettings,
  type AuctionEntryRequest,
  type DepositSettings,
} from "@/lib/auction-entry.server";
import { recordAdminActivity } from "@/lib/admin.server";
import { useAdminList } from "@/lib/use-admin-list";
import { useLanguage } from "@/lib/language";
import { addNotification } from "@/lib/notifications";
import { formatPrice } from "@/lib/mock-data";
import { toast } from "sonner";

/** Desktop: avatar | user | car | deposit | date | status | chevron — header + rows share this */
const ENTRY_TABLE_GRID =
  "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.25fr)_6.5rem_4.75rem_5.5rem_16px]";

function EntryRequestRow({
  req,
  expanded,
  onToggle,
  updating,
  rejectionReason,
  onRejectionReasonChange,
  onStatusChange,
}: {
  req: AuctionEntryRequest;
  expanded: boolean;
  onToggle: () => void;
  updating: boolean;
  rejectionReason: string;
  onRejectionReasonChange: (v: string) => void;
  onStatusChange: (status: string) => void;
}) {
  const { t } = useLanguage();
  const [showProof, setShowProof] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const dateStr = new Date(req.created_at).toLocaleDateString(undefined, { day: "numeric", month: "numeric", year: "2-digit" });

  return (
    <article className={`border-b border-border/60 last:border-b-0 ${expanded ? "bg-secondary/10" : "even:bg-secondary/[0.03]"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-start touch-manipulation"
        aria-expanded={expanded}
      >
        {/* Mobile — stacked */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 sm:hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">
            {(req.user_name || "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-[11px] font-semibold">{req.user_name}</p>
              <AdminStatusBadge status={req.status} />
            </div>
            <p dir="auto" className="truncate text-[10px] text-muted-foreground">{req.car_title}</p>
            <p className="text-[9px] text-muted-foreground tabular-nums">
              {formatPrice(req.deposit_amount)} · {dateStr}
            </p>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>

        {/* Desktop — aligned with header grid */}
        <div className={`hidden sm:grid ${ENTRY_TABLE_GRID} gap-x-3 items-center px-3 py-1.5`}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">
            {(req.user_name || "?")[0].toUpperCase()}
          </div>
          <p className="truncate text-[11px] font-semibold text-start">{req.user_name}</p>
          <p dir="auto" className="truncate text-[10px] text-muted-foreground text-start">{req.car_title}</p>
          <span className="text-[10px] font-semibold tabular-nums text-primary-glow text-start whitespace-nowrap">
            {formatPrice(req.deposit_amount)}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums text-start whitespace-nowrap">{dateStr}</span>
          <div className="text-start">
            <AdminStatusBadge status={req.status} />
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-secondary/5 px-2.5 py-2 sm:px-3 space-y-2">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[10px]">
            <div className="min-w-0">
              <dt className="text-[8px] uppercase tracking-wide text-muted-foreground">{t("sell_email")}</dt>
              <dd className="font-medium break-all">{req.user_email}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[8px] uppercase tracking-wide text-muted-foreground">{t("admin_car_lbl")}</dt>
              <dd className="font-medium truncate">
                <Link to="/cars/$carId" params={{ carId: req.car_id }} className="text-primary-glow hover:underline">
                  {req.car_title}
                </Link>
              </dd>
            </div>
            <div className="min-w-0 sm:hidden">
              <dt className="text-[8px] uppercase tracking-wide text-muted-foreground">{t("admin_deposit_lbl")}</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(req.deposit_amount)}</dd>
            </div>
            {req.instapay_number && (
              <div className="col-span-2 sm:col-span-3 min-w-0">
                <dt className="text-[8px] uppercase tracking-wide text-muted-foreground">{t("admin_refund_ip")}</dt>
                <dd className="font-mono font-semibold text-primary-glow" dir="ltr">{req.instapay_number}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/20 pt-1.5">
            <button
              type="button"
              onClick={() => setShowProof((v) => !v)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-glow"
            >
              <Eye className="h-3 w-3" />
              {showProof ? t("admin_hide_proof") : t("admin_view_proof")}
            </button>
            {showProof && (
              <img
                src={req.proof_image_url}
                alt="Payment proof"
                className="max-h-36 w-full cursor-zoom-in rounded-md border border-border/40 bg-black/20 object-contain"
                onClick={() => setLightbox(true)}
              />
            )}
          </div>

          {req.status === "pending" ? (
            <div className="flex flex-col sm:flex-row gap-1.5 border-t border-border/20 pt-1.5">
              <Input
                placeholder={t("admin_reject_reason")}
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                className="h-7 flex-1 bg-background/50 text-[11px]"
              />
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="h-7 flex-1 sm:flex-none px-3 bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/40 text-[10px]"
                  disabled={updating}
                  onClick={() => onStatusChange("approved")}
                >
                  {t("admin_approve_entry")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 sm:flex-none px-3 glass text-destructive border-destructive/30 text-[10px]"
                  disabled={updating}
                  onClick={() => onStatusChange("rejected")}
                >
                  {t("admin_reject")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border/20 pt-1.5 space-y-1">
              {req.status === "rejected" && req.rejection_reason && (
                <p className="text-[10px] text-destructive/90">{req.rejection_reason}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 glass text-[10px]"
                disabled={updating}
                onClick={() => onStatusChange("pending")}
              >
                {t("admin_reset_pending")}
              </Button>
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(false)}
        >
          <img src={req.proof_image_url} alt="Payment proof" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
        </div>
      )}
    </article>
  );
}

function DepositSettingsSheet({
  open,
  onOpenChange,
  depositForm,
  setDepositForm,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depositForm: DepositSettings;
  setDepositForm: React.Dispatch<React.SetStateAction<DepositSettings>>;
  saving: boolean;
  onSave: () => void;
}) {
  const { t, lang } = useLanguage();
  const sheetSide = lang === "ar" ? "left" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={sheetSide} className="z-[90] w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle>{t("admin_deposit_cfg")}</SheetTitle>
          <SheetDescription className="text-xs">{t("admin_deposit_cfg_hint")}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("admin_deposit_amt")}</label>
            <Input
              type="number"
              min={1}
              value={depositForm.depositAmount}
              onChange={(e) => setDepositForm((f) => ({ ...f, depositAmount: Number(e.target.value) }))}
              className="h-9 bg-background/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("admin_transfer_number")}</label>
            <Input
              value={depositForm.transferNumber}
              onChange={(e) => setDepositForm((f) => ({ ...f, transferNumber: e.target.value }))}
              placeholder={t("admin_transfer_number_ph")}
              className="h-9 bg-background/50 font-mono"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("admin_pay_info")}</label>
            <Input
              value={depositForm.paymentInfo}
              onChange={(e) => setDepositForm((f) => ({ ...f, paymentInfo: e.target.value }))}
              placeholder={t("admin_pay_info_ph")}
              className="h-9 bg-background/50"
            />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button
            className="w-full bg-gradient-primary border-0 text-primary-foreground"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "…" : t("admin_save_settings")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AdminEntryRequestsSection({
  initialDepositSettings,
}: {
  initialDepositSettings: DepositSettings;
}) {
  const { t } = useLanguage();
  const [depositForm, setDepositForm] = useState<DepositSettings>(initialDepositSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});

  const list = useAdminList<AuctionEntryRequest, Awaited<ReturnType<typeof queryAdminEntryRequests>>>(
    (q) => queryAdminEntryRequests({ data: q }),
    { initialPageSize: 20 },
  );

  const pendingCount = (list.meta as { pendingCount?: number }).pendingCount ?? 0;

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateAuctionDepositSettings({ data: depositForm });
      toast.success(t("toast_deposit_saved"));
      setSettingsOpen(false);
    } catch {
      toast.error(t("toast_save_fail"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStatus = async (req: AuctionEntryRequest, status: string) => {
    setUpdatingId(req.id);
    try {
      const reason = rejectionReasons[req.id] ?? "";
      await updateAuctionEntryStatus({
        data: {
          id: req.id,
          status,
          rejectionReason: status === "rejected" ? reason : undefined,
          userEmail: req.user_email,
          carId: req.car_id,
          depositAmount: req.deposit_amount,
        },
      });
      await recordAdminActivity({
        data: { action: `entry_${status}`, entityType: "auction_entry", entityId: String(req.id), details: req.car_title },
      }).catch(() => {});
      toast.success(status === "approved" ? t("toast_entry_approved") : t("toast_entry_status", { status }));
      if (status === "approved") {
        addNotification({
          type: "entry_approved",
          title: t("notif_entry_approved_title"),
          body: t("notif_entry_approved_body", { car: req.car_title }),
          carId: req.car_id,
        });
      } else if (status === "rejected") {
        addNotification({
          type: "entry_rejected",
          title: t("notif_entry_rejected_title"),
          body: t("notif_entry_rejected_body", { car: req.car_title }) + (reason ? `: ${reason}` : ""),
          carId: req.car_id,
        });
      }
      list.reload();
    } catch {
      toast.error(t("toast_entry_fail"));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-gradient-card border border-border/60 p-3 sm:p-4 min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-base leading-tight">{t("admin_entry_req")}</h3>
          <p className="text-[10px] text-muted-foreground truncate">{t("admin_entry_sub")}</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">{list.total} {t("admin_total")}</Badge>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[10px] shrink-0">
          {pendingCount} {t("admin_pending")}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 glass px-2.5 text-[11px]"
          title={t("admin_deposit_cfg")}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[7rem] truncate sm:max-w-none">{t("admin_deposit_cfg")}</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-1.5 mb-2">
        <div className="relative flex-1">
          <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            placeholder={t("admin_search_entries")}
            className="h-8 ps-7 text-[11px] glass"
          />
        </div>
        <select
          value={list.status}
          onChange={(e) => list.setStatus(e.target.value)}
          className="h-8 rounded-lg border border-border/60 bg-background/60 px-2 text-[11px] sm:min-w-[120px]"
        >
          <option value="">{t("admin_all_status")}</option>
          <option value="pending">{t("admin_status_pending")}</option>
          <option value="approved">{t("admin_status_approved")}</option>
          <option value="rejected">{t("admin_status_rejected")}</option>
        </select>
      </div>

      {/* Column headers — desktop */}
      <div className={`hidden sm:grid ${ENTRY_TABLE_GRID} gap-x-3 items-center px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40`}>
        <span />
        <span className="text-start">{t("admin_tbl_user")}</span>
        <span className="text-start">{t("admin_tbl_car")}</span>
        <span className="text-start">{t("admin_deposit_lbl")}</span>
        <span className="text-start">{t("admin_submitted")}</span>
        <span className="text-start">{t("admin_tbl_status")}</span>
        <span />
      </div>

      {list.error && <p className="text-sm text-destructive text-center py-6">{list.error}</p>}

      {!list.error && !list.loading && list.rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-7 w-7 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{t("admin_no_entries")}</p>
        </div>
      )}

      {!list.error && list.rows.length > 0 && (
        <>
          <div className="flex-1 min-h-0 max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-card/20">
            {list.rows.map((req) => (
              <EntryRequestRow
                key={req.id}
                req={req}
                expanded={expandedId === req.id}
                onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
                updating={updatingId === req.id}
                rejectionReason={rejectionReasons[req.id] ?? ""}
                onRejectionReasonChange={(v) => setRejectionReasons((r) => ({ ...r, [req.id]: v }))}
                onStatusChange={(status) => handleStatus(req, status)}
              />
            ))}
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

      <DepositSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        depositForm={depositForm}
        setDepositForm={setDepositForm}
        saving={savingSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
