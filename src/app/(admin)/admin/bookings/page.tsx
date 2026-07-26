"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { FilterSelect } from "@/components/admin/Buttons";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { Select } from "@/components/admin/FormFields";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface BookingRow {
  _id: string;
  travelDate: string;
  bookingDate: string;
  price: number;
  currency: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  userId?: { firstName: string; lastName: string; email: string };
  destinationId?: { title: string; city: string; country: string };
  activityId?: { title: string };
}

const statusOptions = ["pending", "confirmed", "cancelled", "completed"];

export default function BookingsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<BookingRow[]>("/bookings", {
        page,
        limit: 10,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, paymentStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch(`/bookings/${id}`, { status: newStatus });
      showToast("Booking updated");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to update booking", "error");
    }
  }

  return (
    <div>
      <Topbar title="Bookings" subtitle="Every seat booked across destinations and activities" />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            value={status}
            onChange={(v) => { setPage(1); setStatus(v); }}
            options={[{ label: "All statuses", value: "" }, ...statusOptions.map((s) => ({ label: s, value: s }))]}
          />
          <FilterSelect
            value={paymentStatus}
            onChange={(v) => { setPage(1); setPaymentStatus(v); }}
            options={[
              { label: "All payment statuses", value: "" },
              { label: "Unpaid", value: "pending" },
              { label: "Paid", value: "paid" },
              { label: "Refunded", value: "refunded" },
              { label: "Failed", value: "failed" },
            ]}
          />
        </div>

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No bookings found" description="Try adjusting your filters." />
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Traveler</th>
                    <th className="px-6 py-3 font-medium">Destination</th>
                    <th className="px-6 py-3 font-medium">Travel date</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Payment</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((b) => (
                    <tr key={b._id}>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-ink">{b.userId ? `${b.userId.firstName} ${b.userId.lastName}` : "—"}</p>
                        <p className="text-xs text-ink-soft">{b.userId?.email}</p>
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">
                        {b.destinationId ? `${b.destinationId.title}, ${b.destinationId.country}` : "—"}
                        {b.activityId ? <span className="block text-xs text-ink-soft">{b.activityId.title}</span> : null}
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">{new Date(b.travelDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5 text-ink-muted">{b.currency} {b.price}</td>
                      <td className="px-6 py-3.5">
                        <Badge tone={b.paymentStatus === "paid" ? "success" : b.paymentStatus === "refunded" ? "info" : b.paymentStatus === "failed" ? "danger" : "warning"}>
                          {b.paymentStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <Select value={b.status} onChange={(e) => updateStatus(b._id, e.target.value)} className="!w-36 !py-1.5 !text-xs">
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s[0].toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </Select>
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
