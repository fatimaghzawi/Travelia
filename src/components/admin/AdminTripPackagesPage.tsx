"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { Pagination } from "@/components/admin/Pagination";
import { Topbar } from "@/components/admin/Topbar";

type DestinationOption = {
  _id: string;
  title: string;
  city?: string;
  country?: string;
};

type TripPackageRow = {
  _id: string;
  title?: string | null;
  departureDate: string;
  returnDate: string;
  capacity: number;
  bookedCount?: number;
  price: number;
  guideIncluded: boolean;
  status: "open" | "closed" | "full";
  isPublished: boolean;
  destinationId:
    | string
    | { _id: string; title?: string; city?: string; country?: string };
};

function formatRange(dep: string, ret: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${new Date(dep).toLocaleDateString("en-US", opts)} → ${new Date(ret).toLocaleDateString("en-US", opts)}`;
}

function destinationLabel(
  destinationId: TripPackageRow["destinationId"]
): string {
  if (typeof destinationId === "string") return destinationId;
  return destinationId.title || destinationId._id;
}

export function AdminTripPackagesPage() {
  const [packages, setPackages] = useState<TripPackageRow[]>([]);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 10 });

  const [destinationId, setDestinationId] = useState("");
  const [title, setTitle] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [price, setPrice] = useState("500");
  const [guideIncluded, setGuideIncluded] = useState(true);
  const [isPublished, setIsPublished] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pkgRes, destRes] = await Promise.all([
        fetch(`/api/trip-packages?page=${page}&limit=10`),
        fetch("/api/destinations?limit=100"),
      ]);
      const pkgJson = await pkgRes.json();
      const destJson = await destRes.json();
      if (!pkgRes.ok || !pkgJson.success) {
        throw new Error(pkgJson.message || "Failed to load packages");
      }
      if (!destRes.ok || !destJson.success) {
        throw new Error(destJson.message || "Failed to load destinations");
      }
      setPackages(pkgJson.data || []);
      if (pkgJson.meta) {
        setMeta({
          total: pkgJson.meta.total ?? 0,
          page: pkgJson.meta.page ?? page,
          totalPages: pkgJson.meta.totalPages ?? 1,
          limit: pkgJson.meta.limit ?? 10,
        });
      }
      setDestinations(destJson.data || []);
      if (!destinationId && destJson.data?.[0]?._id) {
        setDestinationId(String(destJson.data[0]._id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [destinationId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch when page changes
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/trip-packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationId,
            title: title.trim() || null,
            departureDate,
            returnDate,
            capacity: Number(capacity),
            price: Number(price),
            guideIncluded,
            isPublished,
            status: "open",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Create failed");
        }
        setMessage("Trip package created");
        setTitle("");
        if (page === 1) {
          await load();
        } else {
          setPage(1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create failed");
      }
    });
  }

  async function togglePublished(pkg: TripPackageRow) {
    setError(null);
    try {
      const res = await fetch(`/api/trip-packages/${pkg._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !pkg.isPublished }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Update failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function setClosed(pkg: TripPackageRow) {
    setError(null);
    try {
      const res = await fetch(`/api/trip-packages/${pkg._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Update failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function removePackage(pkg: TripPackageRow) {
    if (!confirm("Delete this trip package?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/trip-packages/${pkg._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Delete failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <Topbar
        title="Trip Packages"
        subtitle="Create dated departures travelers can book. Destination pages stay informational."
      />

      <div className="space-y-6 p-8">
      <form
        onSubmit={onCreate}
        className="grid gap-3 admin-panel p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <h2 className="sm:col-span-2 lg:col-span-3 text-sm font-semibold text-ink">
          New package
        </h2>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Destination</span>
          <select
            required
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2"
          >
            <option value="" disabled>
              Select destination
            </option>
            {destinations.map((d) => (
              <option key={d._id} value={d._id}>
                {d.title}
                {d.city ? ` · ${d.city}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Title (optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summer week"
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Departure</span>
          <input
            type="date"
            required
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Return</span>
          <input
            type="date"
            required
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Seats</span>
          <input
            type="number"
            min={1}
            required
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Price (USD)</span>
          <input
            type="number"
            min={0}
            step="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2 lg:col-span-1">
          <input
            type="checkbox"
            checked={guideIncluded}
            onChange={(e) => setGuideIncluded(e.target.checked)}
          />
          Guide included
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          Published
        </label>

        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={pending || !destinationId}
            className="rounded-lg bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71] disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create package"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[#127E83]" role="status">
          {message}
        </p>
      ) : null}

      <div className="admin-panel overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm text-ink-soft">Loading packages…</p>
        ) : packages.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">No trip packages yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2.5 font-medium">Destination</th>
                <th className="px-3 py-2.5 font-medium">Dates</th>
                <th className="px-3 py-2.5 font-medium">Seats</th>
                <th className="px-3 py-2.5 font-medium">Price</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg._id} className="border-b border-border">
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">
                      {destinationLabel(pkg.destinationId)}
                    </p>
                    {pkg.title ? (
                      <p className="text-xs text-ink-soft">{pkg.title}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    {formatRange(pkg.departureDate, pkg.returnDate)}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    {Math.max(0, pkg.capacity - (pkg.bookedCount ?? 0))} /{" "}
                    {pkg.capacity}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    ${pkg.price.toLocaleString()}
                    {pkg.guideIncluded ? (
                      <span className="ml-1 text-xs text-[#127E83]">
                        · guide
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium capitalize text-ink-muted">
                      {pkg.status}
                      {!pkg.isPublished ? " · draft" : ""}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => togglePublished(pkg)}
                        className="text-xs font-medium text-[#127E83] hover:underline"
                      >
                        {pkg.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      {pkg.status !== "closed" ? (
                        <button
                          type="button"
                          onClick={() => setClosed(pkg)}
                          className="text-xs font-medium text-amber-700 hover:underline"
                        >
                          Close
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removePackage(pkg)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
