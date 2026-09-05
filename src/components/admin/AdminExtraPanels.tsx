import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2, Gavel, Bell, Shield, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { formatPrice } from "@/lib/mock-data";
import { useLanguage } from "@/lib/language";
import {
  getAdminEmailsFromDb, addAdminEmail, removeAdminEmail,
  sendBroadcastNotification, getBroadcastNotifications,
  getExpenses, createExpense, deleteExpense,
  type ActivityLogEntry, type AdminBidRow, type BroadcastNotification,
  type FinancialSummary, type Expense,
} from "@/lib/admin.server";
import {
  queryAdminBids, queryAdminActivity,
} from "@/lib/admin-tables.server";
import { getPendingRefunds, markDepositRefunded, type UserDeposit } from "@/lib/deposits.server";
import { useAdminList } from "@/lib/use-admin-list";
import { toast } from "sonner";

export function AdminFinancialPanel({ summary }: { summary: FinancialSummary }) {
  const { t } = useLanguage();
  const cards = [
    { label: t("admin_fin_inventory"), sub: t("admin_fin_inventory_sub"), value: formatPrice(summary.inventoryValue), color: "text-blue-400" },
    { label: t("admin_fin_live"), sub: t("admin_fin_live_sub"), value: formatPrice(summary.liveAuctionValue), color: "text-[var(--live)]" },
    { label: t("admin_fin_sold"), sub: t("admin_fin_sold_sub", { count: summary.soldCount }), value: formatPrice(summary.soldRevenue), color: "text-green-400" },
    { label: t("admin_fin_expenses"), sub: t("admin_fin_expenses_sub"), value: formatPrice(summary.totalExpenses ?? 0), color: "text-orange-400" },
    { label: t("admin_fin_net"), sub: t("admin_fin_net_sub"), value: formatPrice(summary.netRevenue ?? 0), color: "text-primary-glow" },
    { label: t("admin_fin_bids"), sub: t("admin_fin_bids_sub", { count: summary.totalBidsCount }), value: formatPrice(summary.totalBidsVolume), color: "text-yellow-400" },
    { label: t("admin_fin_deposits_held"), sub: t("admin_fin_pending_refunds"), value: formatPrice(summary.depositsHeld ?? 0), color: "text-cyan-400" },
    { label: t("admin_fin_deposits_refunded"), sub: `${summary.pendingRefundsCount ?? 0} pending`, value: formatPrice(summary.depositsRefunded ?? 0), color: "text-muted-foreground" },
    { label: t("admin_fin_avg"), sub: t("admin_fin_listed") + `: ${summary.listedCount}`, value: formatPrice(summary.avgSoldPrice), color: "text-primary-glow" },
    { label: t("admin_pending_winners"), sub: `${summary.liveCount} ${t("admin_status_live")}`, value: String(summary.pendingWinnersCount ?? 0), color: "text-amber-400" },
  ];
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4 sm:p-5 mb-4">
      <h3 className="font-display font-semibold text-sm mb-3">{t("admin_fin_title")}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border/40 bg-secondary/10 p-3">
            <div className={`text-[10px] uppercase tracking-wider font-medium ${c.color}`}>{c.label}</div>
            <div className="font-display text-lg font-bold mt-0.5 tabular-nums">{c.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminExpensesPanel() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await getExpenses());
    } catch {
      toast.error(t("toast_save_fail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const handleAdd = async () => {
    if (!title.trim() || !amount) return;
    setSaving(true);
    try {
      await createExpense({
        data: {
          title: title.trim(),
          category: category.trim() || undefined,
          amount: Number(amount),
          expenseDate,
        },
      });
      setTitle("");
      setCategory("");
      setAmount("");
      toast.success(t("admin_expenses_add"));
      await reload();
    } catch {
      toast.error(t("toast_save_fail"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense({ data: id });
      await reload();
    } catch {
      toast.error(t("toast_delete_fail"));
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-card border border-border/60 p-4 sm:p-6 space-y-4">
      <h3 className="font-display font-semibold text-lg">{t("admin_expenses_title")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="glass" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="glass" />
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="glass" />
        <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="glass" />
        <Button onClick={handleAdd} disabled={saving} className="bg-gradient-primary border-0 text-primary-foreground">
          {t("admin_expenses_add")}
        </Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">—</p>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-secondary/10 px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">{e.category || "—"} · {e.expense_date}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-display font-semibold tabular-nums">{formatPrice(Number(e.amount))}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminRefundsPanel() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<UserDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await getPendingRefunds());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const handleRefund = async (id: number) => {
    try {
      await markDepositRefunded({ data: id });
      toast.success(t("admin_refund_ok"));
      await reload();
    } catch {
      toast.error(t("toast_save_fail"));
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-card border border-border/60 p-4 sm:p-6 space-y-4 mt-4">
      <h3 className="font-display font-semibold text-lg">{t("admin_refunds_title")}</h3>
      {loading ? <p className="text-sm text-muted-foreground">…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">—</p>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/40 bg-secondary/10 px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium text-sm">{d.car_title ?? d.car_id}</div>
                <div className="text-[11px] text-muted-foreground">{d.user_email} · Instapay: {d.instapay_number || "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold tabular-nums">{formatPrice(Number(d.refund_amount ?? d.amount * 0.8))}</span>
                <Button size="sm" className="text-xs h-8" onClick={() => handleRefund(d.id)}>{t("admin_refund_done")}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminBidsPanel({ carOptions }: { carOptions: { id: string; title: string }[] }) {
  const { t } = useLanguage();
  const list = useAdminList<AdminBidRow>(
    (q) => queryAdminBids({ data: q }),
    { initialSort: "created_at", initialPageSize: 20 },
  );

  const columns = useMemo(
    () => [
      {
        id: "user_name",
        header: "Bidder",
        cell: (b: AdminBidRow) => (
          <div>
            <span className="font-medium">{b.user_name}</span>
            {b.user_email && <div className="text-[10px] text-muted-foreground">{b.user_email}</div>}
          </div>
        ),
      },
      {
        id: "car",
        header: "Car",
        cell: (b: AdminBidRow) => (
          <div className="flex items-center gap-1.5 min-w-0">
            <Link to="/cars/$carId" params={{ carId: b.car_id }} className="hover:text-primary-glow truncate max-w-[160px]">
              {b.car_title}
            </Link>
            {b.is_live && <AdminStatusBadge status="live" />}
          </div>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        sortable: true,
        className: "text-end",
        headerClassName: "text-end",
        cell: (b: AdminBidRow) => (
          <span className="font-display font-semibold tabular-nums">{formatPrice(b.amount)}</span>
        ),
      },
      {
        id: "created_at",
        header: "Time",
        sortable: true,
        className: "text-end",
        headerClassName: "text-end",
        cell: (b: AdminBidRow) => (
          <span className="text-muted-foreground tabular-nums">{new Date(b.created_at).toLocaleString()}</span>
        ),
      },
    ],
    [],
  );

  return (
    <AdminDataTable
      title={t("admin_bids_title")}
      subtitle={t("admin_bids_sub")}
      columns={columns}
      rows={list.rows}
      rowKey={(b) => b.id}
      total={list.total}
      page={list.page}
      pageSize={list.pageSize}
      onPageChange={list.setPage}
      onPageSizeChange={list.setPageSize}
      sortColumn={list.sortColumn}
      sortDir={list.sortDir}
      onSortChange={list.onSortChange}
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search bidder or car…"
      loading={list.loading}
      error={list.error}
      emptyMessage={t("admin_no_bids")}
      compact={false}
      filters={
        <select
          value={list.carId}
          onChange={(e) => list.setCarId(e.target.value)}
          className="h-8 rounded-md border border-border bg-background/60 px-2 text-[11px] min-w-[160px]"
        >
          <option value="">{t("admin_all_cars")}</option>
          {carOptions.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      }
    />
  );
}

export function AdminActivityPanel() {
  const { t } = useLanguage();
  const list = useAdminList<ActivityLogEntry>((q) => queryAdminActivity({ data: q }));

  const columns = useMemo(
    () => [
      {
        id: "action",
        header: "Action",
        cell: (e: ActivityLogEntry) => <AdminStatusBadge status={e.action} />,
      },
      {
        id: "admin_email",
        header: "Admin",
        hideOnMobile: true,
        cell: (e: ActivityLogEntry) => <span className="text-muted-foreground">{e.admin_email}</span>,
      },
      {
        id: "details",
        header: "Details",
        cell: (e: ActivityLogEntry) => (
          <span className="line-clamp-1 text-[11px]">
            {e.details ?? ""}
            {e.entity_id && <span className="text-primary-glow ms-1">{e.entity_type}: {e.entity_id}</span>}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "When",
        className: "text-end",
        headerClassName: "text-end",
        cell: (e: ActivityLogEntry) => (
          <span className="text-muted-foreground tabular-nums">{new Date(e.created_at).toLocaleString()}</span>
        ),
      },
    ],
    [],
  );

  return (
    <AdminDataTable
      title={t("admin_activity_title")}
      columns={columns}
      rows={list.rows}
      rowKey={(e) => e.id}
      total={list.total}
      page={list.page}
      pageSize={list.pageSize}
      onPageChange={list.setPage}
      onPageSizeChange={list.setPageSize}
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search activity…"
      loading={list.loading}
      error={list.error}
      emptyMessage={t("admin_no_activity")}
    />
  );
}

export function AdminSettingsPanel() {
  const { t } = useLanguage();
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminEmailsFromDb().then(setAdmins).catch(() => {});
    getBroadcastNotifications().then(setBroadcasts).catch(() => {});
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdmin.trim()) return;
    setSaving(true);
    try {
      const updated = await addAdminEmail({ data: newAdmin.trim() });
      setAdmins(updated);
      setNewAdmin("");
      toast.success(t("admin_admin_added"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_save_fail"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Remove admin ${email}?`)) return;
    setSaving(true);
    try {
      const updated = await removeAdminEmail({ data: email });
      setAdmins(updated);
      toast.success(t("admin_admin_removed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast_save_fail"));
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setSaving(true);
    try {
      const n = await sendBroadcastNotification({ data: { title: broadcastTitle, body: broadcastBody } });
      setBroadcasts((prev) => [n, ...prev]);
      setBroadcastTitle("");
      setBroadcastBody("");
      toast.success(t("admin_broadcast_sent"));
    } catch {
      toast.error(t("toast_save_fail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card/40 p-4 sm:p-5">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary-glow" /> {t("admin_admins_title")}
        </h3>
        <div className="flex gap-2 mb-3">
          <Input value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} placeholder="admin@example.com" className="bg-background/50 flex-1 h-8 text-xs" />
          <Button onClick={handleAddAdmin} disabled={saving} size="sm" className="bg-gradient-primary border-0 h-8">{t("admin_add")}</Button>
        </div>
        <div className="space-y-1">
          {admins.map((email) => (
            <div key={email} className="flex items-center justify-between rounded-md bg-secondary/20 px-3 py-1.5 text-xs">
              <span>{email}</span>
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-[10px]" onClick={() => handleRemoveAdmin(email)} disabled={saving}>
                {t("admin_remove")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 p-4 sm:p-5">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary-glow" /> {t("admin_broadcast_title")}
        </h3>
        <div className="space-y-2 mb-3">
          <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder={t("admin_broadcast_title_ph")} className="bg-background/50 h-8 text-xs" />
          <textarea
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            placeholder={t("admin_broadcast_body_ph")}
            rows={3}
            className="w-full bg-background/50 border border-border rounded-md px-3 py-2 text-xs outline-none focus:border-primary resize-none"
          />
        </div>
        <Button onClick={handleBroadcast} disabled={saving} size="sm" className="bg-gradient-primary border-0">
          {t("admin_send_broadcast")}
        </Button>
        {broadcasts.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("admin_recent_broadcasts")}</p>
            {broadcasts.slice(0, 5).map((b) => (
              <div key={b.id} className="text-[11px] rounded-md bg-secondary/20 px-2.5 py-1.5">
                <div className="font-medium">{b.title}</div>
                <div className="text-muted-foreground line-clamp-2">{b.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** @deprecated Use AdminCarsInventoryPanel — kept for export compat */
export function CarInventoryFilters() {
  return null;
}

/** @deprecated Server-side filtering in AdminCarsInventoryPanel */
export function filterCars<T>(cars: T[]): T[] {
  return cars;
}
