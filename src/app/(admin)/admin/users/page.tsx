"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users as UsersIcon, ShieldCheck, ShieldAlert, Ban } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { SearchInput, FilterSelect } from "@/components/admin/Buttons";
import { Badge } from "@/components/admin/Badge";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/admin/Toast";
import { api } from "@/lib/api/client";

interface UserRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
  role: string;
  status: string;
  verificationStatus: string;
  createdAt: string;
}

export default function UsersPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [verification, setVerification] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta: m } = await api.get<UserRow[]>("/users", {
        page,
        limit: 10,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
        verificationStatus: verification || undefined,
      });
      setRows(data);
      if (m) setMeta(m as typeof meta);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, role, status, verification]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  return (
    <div>
      <Topbar title="Users" subtitle="Manage traveler and admin accounts, and verify passports" />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search by name or email…" />
          <FilterSelect
            value={role}
            onChange={(v) => { setPage(1); setRole(v); }}
            options={[
              { label: "All roles", value: "" },
              { label: "Traveler", value: "TRAVELER" },
              { label: "Admin", value: "ADMIN" },
            ]}
          />
          <FilterSelect
            value={verification}
            onChange={(v) => { setPage(1); setVerification(v); }}
            options={[
              { label: "All verification", value: "" },
              { label: "Unverified", value: "unverified" },
              { label: "Pending", value: "pending" },
              { label: "Verified", value: "verified" },
              { label: "Rejected", value: "rejected" },
            ]}
          />
          <FilterSelect
            value={status}
            onChange={(v) => { setPage(1); setStatus(v); }}
            options={[
              { label: "All statuses", value: "" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Blocked", value: "blocked" },
            ]}
          />
        </div>

        <div className="admin-panel overflow-hidden">
          {!loading && rows.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your filters." />
          ) : (
            <div className="admin-scroll overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Verification</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((user) => (
                    <tr key={user._id} className="cursor-pointer hover:bg-surface-muted">
                      <td className="px-6 py-3.5">
                        <Link href={`/admin/users/${user._id}`} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </span>
                          <span className="font-medium text-ink">
                            {user.firstName} {user.lastName}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">{user.email}</td>
                      <td className="px-6 py-3.5">
                        <Badge tone={user.role === "ADMIN" ? "info" : "neutral"}>{user.role}</Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <VerificationBadge status={user.verificationStatus} />
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge tone={user.status === "active" ? "success" : user.status === "blocked" ? "danger" : "neutral"}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-ink-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
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

function VerificationBadge({ status }: { status: string }) {
  const icon =
    status === "verified" ? ShieldCheck : status === "rejected" ? Ban : ShieldAlert;
  const Icon = icon;
  return (
    <Badge tone={status === "verified" ? "success" : status === "pending" ? "warning" : status === "rejected" ? "danger" : "neutral"}>
      <Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}
