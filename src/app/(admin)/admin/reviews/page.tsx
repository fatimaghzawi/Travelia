"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Check, X, Trash2 } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { FilterSelect, IconButton } from "@/components/admin/Buttons";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface ReviewRow {
  _id: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
  createdAt: string;
  userId?: { firstName: string; lastName: string };
  destinationId?: { title: string; city: string; country: string };
}

export default function ReviewsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<ReviewRow[]>("/reviews", {
        page,
        limit: 10,
        isApproved: approval || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, approval]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function setApprovalState(id: string, isApproved: boolean) {
    try {
      await api.patch(`/reviews/${id}`, { isApproved });
      showToast(isApproved ? "Review approved" : "Review hidden");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to update review", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/reviews/${deleteTarget._id}`);
      showToast("Review deleted");
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
      <Topbar title="Reviews" subtitle="Moderate traveler reviews shown on destination pages" />

      <div className="space-y-4 p-8">
        <FilterSelect
          value={approval}
          onChange={(v) => { setPage(1); setApproval(v); }}
          options={[
            { label: "All reviews", value: "" },
            { label: "Approved", value: "true" },
            { label: "Hidden", value: "false" },
          ]}
        />

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={Star} title="No reviews found" description="Try adjusting your filters." />
          ) : (
            <div className="divide-y divide-border">
              {rows.map((review) => (
                <div key={review._id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">
                        {review.userId ? `${review.userId.firstName} ${review.userId.lastName}` : "Traveler"}
                      </p>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5" fill={i < review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <Badge tone={review.isApproved ? "success" : "warning"}>
                        {review.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {review.destinationId ? `${review.destinationId.title}, ${review.destinationId.country}` : ""} · {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm text-ink-muted">{review.comment || "No comment left."}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!review.isApproved ? (
                      <IconButton title="Approve" onClick={() => setApprovalState(review._id, true)}>
                        <Check className="h-4 w-4 text-teal-600" />
                      </IconButton>
                    ) : (
                      <IconButton title="Hide" onClick={() => setApprovalState(review._id, false)}>
                        <X className="h-4 w-4 text-amber-500" />
                      </IconButton>
                    )}
                    <IconButton title="Delete" onClick={() => setDeleteTarget(review)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete review"
        description="This will permanently remove this review and update the destination's rating."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
