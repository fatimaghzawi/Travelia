"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, LayoutGrid } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { PrimaryButton, IconButton, SearchInput } from "@/components/admin/Buttons";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";
import { TaxonomyForm, type TaxonomyRecord } from "@/components/admin/TaxonomyForm";

type Row = TaxonomyRecord & { _id: string };

export function TaxonomyListPage({
  resource,
  title,
  subtitle,
  singular,
}: {
  resource: "categories" | "moods";
  title: string;
  subtitle: string;
  singular: string;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<Row[]>(`/${resource}`, {
        page,
        limit: 10,
        search: search || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to load ${resource}`, "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, resource]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/${resource}/${deleteTarget._id}`);
      showToast(`${singular} deleted`);
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
        title={title}
        subtitle={subtitle}
        actions={
          <PrimaryButton onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add {singular.toLowerCase()}
          </PrimaryButton>
        }
      />

      <div className="space-y-4 p-8">
        <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder={`Search ${resource}…`} />

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={LayoutGrid} title={`No ${resource} yet`} description={`Add your first ${singular.toLowerCase()}.`} />
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Slug</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row._id}>
                      <td className="px-6 py-3.5 font-medium text-ink">
                        <span className="mr-2">{row.icon}</span>
                        {row.name}
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">{row.slug}</td>
                      <td className="max-w-xs truncate px-6 py-3.5 text-ink-muted">{row.description || "—"}</td>
                      <td className="px-6 py-3.5">
                        <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-2">
                          <IconButton title="Edit" onClick={() => { setEditing(row); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton title="Delete" onClick={() => setDeleteTarget(row)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`} width="md">
        <TaxonomyForm
          resource={resource}
          initial={editing ?? undefined}
          onCancel={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); load(); }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${singular.toLowerCase()}`}
        description={`Remove "${deleteTarget?.name}"? Destinations using it won't be deleted, but you'll need to reassign them first if it's in use.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
