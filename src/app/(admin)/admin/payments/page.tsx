"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { FilterSelect } from "@/components/admin/Buttons";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { Select } from "@/components/admin/FormFields";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface PaymentRow {
  _id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  transactionId?: string;
  createdAt: string;
  userId?: { firstName: string; lastName: string; email: string };
  bookingId?: { destinationId?: string; travelDate?: string };
}

const statusOptions = ["pending", "processing", "completed", "failed", "refunded"];

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<PaymentRow[]>("/payments", {
        page,
        limit: 10,
        status: status || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch(`/payments/${id}`, { status: newStatus });
      showToast("Payment updated");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to update payment", "error");
    }
  }

  const totalCompleted = rows.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <Topbar title="Payments" subtitle={`Completed on this page: $${totalCompleted.toLocaleString()}`} />

      <div className="space-y-4 p-8">
        <FilterSelect
          value={status}
          onChange={(v) => { setPage(1); setStatus(v); }}
          options={[{ label: "All statuses", value: "" }, ...statusOptions.map((s) => ({ label: s, value: s }))]}
        />

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments found" description="Try adjusting your filters." />
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Traveler</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Method</th>
                    <th className="px-6 py-3 font-medium">Transaction</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((p) => (
                    <tr key={p._id}>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-ink">{p.userId ? `${p.userId.firstName} ${p.userId.lastName}` : "—"}</p>
                        <p className="text-xs text-ink-soft">{p.userId?.email}</p>
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">{p.currency} {p.amount}</td>
                      <td className="px-6 py-3.5 capitalize text-ink-muted">{p.paymentMethod.replace("_", " ")}</td>
                      <td className="px-6 py-3.5 text-ink-muted">{p.transactionId || "—"}</td>
                      <td className="px-6 py-3.5 text-ink-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <Badge tone={p.status === "completed" ? "success" : p.status === "refunded" ? "info" : p.status === "failed" ? "danger" : "warning"}>
                            {p.status}
                          </Badge>
                          <Select value={p.status} onChange={(e) => updateStatus(p._id, e.target.value)} className="!w-32 !py-1.5 !text-xs">
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>
                                {s[0].toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </Select>
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
    </div>
  );
}
