"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Megaphone, Trash2, Send } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { PrimaryButton, IconButton } from "@/components/admin/Buttons";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
import { Field, TextInput, TextArea, Select, Toggle } from "@/components/admin/FormFields";
import { SecondaryButton } from "@/components/admin/Buttons";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface AnnouncementRow {
  _id: string;
  title: string;
  message: string;
  audience: "all" | "TRAVELER" | "ADMIN";
  isActive: boolean;
  sentCount: number;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
}

export default function AnnouncementsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ title: "", message: "", audience: "all" as const, isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<AnnouncementRow[]>("/announcements", {
        page,
        limit: 10,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load advertisements", "error");
    } finally {
      setLoading(false);
    }
  }, [page, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/announcements", form);
      showToast("Advertisement published");
      setModalOpen(false);
      setForm({ title: "", message: "", audience: "all", isActive: true });
      if (page === 1) {
        load();
      } else {
        setPage(1);
      }
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to publish", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(row: AnnouncementRow) {
    try {
      await api.patch(`/announcements/${row._id}`, { isActive: true });
      showToast("Advertisement published and travelers notified");
      load();
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : "Failed to publish",
        "error"
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/announcements/${deleteTarget._id}`);
      showToast("Advertisement deleted");
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
        title="Advertisements"
        subtitle="Publish sponsored Travelia ads to travelers"
        actions={
          <PrimaryButton onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> New advertisement
          </PrimaryButton>
        }
      />

      <div className="space-y-4 p-8">
        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={Megaphone} title="No advertisements yet" description="Publish your first traveler ad." />
          ) : (
            <div className="divide-y divide-border">
              {rows.map((a) => (
                <div key={a._id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{a.title}</p>
                      <Badge tone="info">{a.audience}</Badge>
                      <Badge tone={a.isActive ? "success" : "neutral"}>{a.isActive ? "Live" : "Draft"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{a.message}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {new Date(a.createdAt).toLocaleString()} · Reached {a.sentCount} user{a.sentCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!a.isActive ? (
                      <IconButton
                        title="Publish & notify"
                        onClick={() => void handlePublish(a)}
                      >
                        <Send className="h-4 w-4 text-teal-600" />
                      </IconButton>
                    ) : null}
                    <IconButton title="Delete" onClick={() => setDeleteTarget(a)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={setPage}
          />
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New advertisement" description="Shown as a sponsored ad on the traveler dashboard and sent as an inbox alert" width="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Headline" required>
            <TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Summer escapes from Beirut" />
          </Field>
          <Field label="Ad copy" required>
            <TextArea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required placeholder="Short promotional message travelers will see…" />
          </Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as typeof f.audience }))}>
              <option value="all">Everyone</option>
              <option value="TRAVELER">Travelers only</option>
              <option value="ADMIN">Admins only</option>
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Publish now</p>
              <p className="text-xs text-ink-soft">Turn off to save as a draft without sending</p>
            </div>
            <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Publishing…" : "Publish ad"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete advertisement"
        description="This removes the ad record. Already-delivered alerts stay in users' inboxes."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
