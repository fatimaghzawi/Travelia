"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, ListTree, MapPin } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { PrimaryButton, IconButton, SearchInput, FilterSelect } from "@/components/admin/Buttons";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";
import {
  DestinationForm,
  type DestinationRecord,
  type CategoryOption,
  type MoodOption,
} from "./DestinationForm";

type DestinationRow = Omit<DestinationRecord, "categoryId"> & {
  _id: string;
  bookedCount: number;
  ratingAverage: number;
  reviewCount: number;
  categoryId: { _id: string; name: string; icon?: string } | string;
};

export default function DestinationsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<DestinationRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [moods, setMoods] = useState<MoodOption[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DestinationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DestinationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<DestinationRow[]>("/destinations", {
        page,
        limit: 10,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        isPublished: publishedFilter || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load destinations", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, publishedFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  useEffect(() => {
    api.get<CategoryOption[]>("/categories", { limit: 100 }).then(({ data }) => setCategories(data));
    api.get<MoodOption[]>("/moods", { limit: 100 }).then(({ data }) => setMoods(data));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/destinations/${deleteTarget._id}`);
      showToast("Destination deleted");
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
      <Topbar
        title="Destinations"
        subtitle="Manage the destination catalog travelers can discover and book"
        actions={
          <PrimaryButton
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add destination
          </PrimaryButton>
        }
      />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search destinations…" />
          <FilterSelect
            value={categoryFilter}
            onChange={(v) => { setPage(1); setCategoryFilter(v); }}
            options={[{ label: "All categories", value: "" }, ...categories.map((c) => ({ label: c.name, value: c._id }))]}
          />
          <FilterSelect
            value={publishedFilter}
            onChange={(v) => { setPage(1); setPublishedFilter(v); }}
            options={[
              { label: "All statuses", value: "" },
              { label: "Published", value: "true" },
              { label: "Unpublished", value: "false" },
            ]}
          />
        </div>

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No destinations yet"
              description="Add your first destination to start building the catalog."
              action={
                <PrimaryButton onClick={() => { setEditing(null); setModalOpen(true); }}>
                  <Plus className="h-4 w-4" /> Add destination
                </PrimaryButton>
              }
            />
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Destination</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Seats</th>
                    <th className="px-6 py-3 font-medium">Rating</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((dest) => (
                    <tr key={dest._id}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                            {dest.thumbnail ? (
                              <Image src={dest.thumbnail} alt={dest.title} fill sizes="56px" className="object-cover" unoptimized />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{dest.title}</p>
                            <p className="truncate text-xs text-ink-soft">{dest.city}, {dest.country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">
                        {dest.categoryId && typeof dest.categoryId === "object"
                          ? dest.categoryId.name
                          : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">{dest.bookedCount}/{dest.capacity}</td>
                      <td className="px-6 py-3.5 text-ink-muted">
                        {dest.ratingAverage ? `${dest.ratingAverage.toFixed(1)} (${dest.reviewCount})` : "—"}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge tone={dest.isPublished ? "success" : "neutral"}>
                          {dest.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/destinations/${dest._id}`}>
                            <IconButton title="Manage activities">
                              <ListTree className="h-4 w-4" />
                            </IconButton>
                          </Link>
                          <IconButton
                            title="Edit"
                            onClick={() => {
                              setEditing(dest);
                              setModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton title="Delete" onClick={() => setDeleteTarget(dest)}>
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit destination" : "Add destination"}
        description="Full control over what travelers see on the destination page"
        width="xl"
      >
        <DestinationForm
          initial={editing ?? undefined}
          categories={categories}
          moods={moods}
          onCancel={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            load();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete destination"
        description={`This will permanently remove "${deleteTarget?.title}" and its activities. This can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
