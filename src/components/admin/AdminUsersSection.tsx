import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { queryAdminUsers, type AdminUserRow } from "@/lib/admin-tables.server";
import { useAdminList } from "@/lib/use-admin-list";
import { useLanguage } from "@/lib/language";

export function AdminUsersSection() {
  const { t } = useLanguage();
  const list = useAdminList<AdminUserRow>((q) => queryAdminUsers({ data: q }), { initialSort: "created_at" });

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        cell: (u: AdminUserRow) => (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium truncate">{u.name}</span>
          </div>
        ),
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        cell: (u: AdminUserRow) => <span className="text-muted-foreground">{u.email}</span>,
      },
      {
        id: "bids",
        header: "Bids",
        className: "text-end",
        headerClassName: "text-end",
        cell: (u: AdminUserRow) => <span className="tabular-nums">{u.bids_count}</span>,
      },
      {
        id: "deposits",
        header: "Deposits",
        hideOnMobile: true,
        className: "text-end",
        headerClassName: "text-end",
        cell: (u: AdminUserRow) => <span className="tabular-nums">{u.deposits_count}</span>,
      },
      {
        id: "wins",
        header: "Wins",
        hideOnMobile: true,
        className: "text-end",
        headerClassName: "text-end",
        cell: (u: AdminUserRow) => <span className="tabular-nums">{u.wins_count}</span>,
      },
      {
        id: "created_at",
        header: "Joined",
        sortable: true,
        className: "text-end",
        headerClassName: "text-end",
        cell: (u: AdminUserRow) => (
          <span className="text-muted-foreground tabular-nums">
            {new Date(u.created_at).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <AdminDataTable
      title={t("admin_reg_users")}
      subtitle={t("admin_reg_users_sub")}
      columns={columns}
      rows={list.rows}
      rowKey={(u) => u.id}
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
      searchPlaceholder="Search name, email, phone…"
      loading={list.loading}
      error={list.error}
      emptyMessage={t("admin_no_users")}
    />
  );
}
