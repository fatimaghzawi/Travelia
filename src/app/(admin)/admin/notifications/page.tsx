"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { FilterSelect, IconButton } from "@/components/admin/Buttons";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface NotificationRow {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  userId?: { firstName: string; lastName: string; email: string };
}

const types = ["booking", "trip", "reminder", "promotion", "announcement"];

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<NotificationRow[]>("/notifications", {
        page,
        limit: 15,
        type: type || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function handleDelete(id: string) {
    try {
      await api.delete(`/notifications/${id}`);
      showToast("Notification deleted");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to delete", "error");
    }
  }

  return (
    <div>
      <Topbar title="Notifications" subtitle="System-generated alerts delivered to users" />

      <div className="space-y-4 p-8">
        <FilterSelect
          value={type}
          onChange={(v) => { setPage(1); setType(v); }}
          options={[{ label: "All types", value: "" }, ...types.map((t) => ({ label: t, value: t }))]}
        />

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications yet" />
          ) : (
            <div className="divide-y divide-border">
              {rows.map((n) => (
                <div key={n._id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{n.title}</p>
                      <Badge tone="info">{n.type}</Badge>
                      {!n.isRead ? <Badge tone="warning">Unread</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{n.message}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {n.userId ? `${n.userId.firstName} ${n.userId.lastName}` : "Unknown user"} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <IconButton title="Delete" onClick={() => handleDelete(n._id)}>
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
