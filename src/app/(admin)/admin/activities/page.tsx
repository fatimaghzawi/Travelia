"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Pencil, Trash2, Compass, ExternalLink } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { IconButton, SearchInput, FilterSelect } from "@/components/admin/Buttons";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";
import { ActivityForm, type ActivityRecord } from "../destinations/ActivityForm";

type ActivityRow = Omit<ActivityRecord, "destinationId"> & {
  _id: string;
  bookedCount: number;
  destinationId: { _id: string; title: string; city: string; country: string } | string;
};

interface DestinationOption {
  _id: string;
  title: string;
}

export default function ActivitiesPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<ActivityRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<ActivityRow[]>("/activities", {
        page,
        limit: 10,
        search: search || undefined,
        destinationId: destinationFilter || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load activities", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, destinationFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  useEffect(() => {
    api.get<DestinationOption[]>("/destinations", { limit: 200 }).then(({ data }) => setDestinations(data));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/activities/${deleteTarget._id}`);
      showToast("Activity deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Topbar title="Activities" subtitle="All bookable activities across every destination" />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search activities…" />
          <FilterSelect
            value={destinationFilter}
            onChange={(v) => { setPage(1); setDestinationFilter(v); }}
            options={[{ label: "All destinations", value: "" }, ...destinations.map((d) => ({ label: d.title, value: d._id }))]}
          />
        </div>

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No activities yet"
              description="Add activities from a destination's detail page."
            />
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Activity</th>
                    <th className="px-6 py-3 font-medium">Destination</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Seats</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((activity) => {
                    const dest = typeof activity.destinationId === "object" ? activity.destinationId : null;
                    return (
                      <tr key={activity._id}>
                        <td className="px-6 py-3.5 font-medium text-ink">{activity.title}</td>
                        <td className="px-6 py-3.5 text-ink-muted">
                          {dest ? (
                            <Link href={`/admin/destinations/${dest._id}`} className="inline-flex items-center gap-1 hover:text-teal-600">
                              {dest.title} <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-3.5 capitalize text-ink-muted">{activity.category}</td>
                        <td className="px-6 py-3.5 text-ink-muted">{activity.price === 0 ? "Free" : `$${activity.price}`}</td>
                        <td className="px-6 py-3.5 text-ink-muted">{activity.bookedCount}/{activity.capacity}</td>
                        <td className="px-6 py-3.5">
                          <Badge tone={activity.isAvailable ? "success" : "neutral"}>{activity.isAvailable ? "Available" : "Hidden"}</Badge>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex justify-end gap-2">
                            <IconButton title="Edit" onClick={() => setEditing(activity)}>
                              <Pencil className="h-4 w-4" />
                            </IconButton>
                            <IconButton title="Delete" onClick={() => setDeleteTarget(activity)}>
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit activity" width="lg">
        {editing ? (
          <ActivityForm
            destinationId={
              editing.destinationId && typeof editing.destinationId === "object"
                ? editing.destinationId._id
                : (editing.destinationId ?? "")
            }
            initial={{
              ...editing,
              destinationId:
                editing.destinationId && typeof editing.destinationId === "object"
                  ? editing.destinationId._id
                  : (editing.destinationId ?? ""),
            }}
            onCancel={() => setEditing(null)}
            onSuccess={() => { setEditing(null); load(); }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete activity"
        description={`Remove "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
