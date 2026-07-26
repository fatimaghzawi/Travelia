"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Wallet,
  CalendarClock,
  PlaneTakeoff,
  Compass,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Topbar } from "@/components/admin/Topbar";
import { StatCard } from "@/components/admin/StatCard";
import { ProgressRing, MoodArcGauge } from "@/components/admin/Charts";
import { VerificationFunnel } from "@/components/admin/VerificationFunnel";
import { WorldMap } from "@/components/admin/WorldMap";
import { api } from "@/lib/api/client";

interface DashboardStats {
  totals: {
    users: number;
    liveTrips: number;
    revenue: number;
    bookingsThisWeek: number;
  };
  verificationFunnel: { unverified: number; pending: number; verified: number; rejected: number };
  topDestinations: {
    id: string;
    title: string;
    city: string;
    country: string;
    capacity: number;
    bookedCount: number;
    occupancy: number;
    latitude: number | null;
    longitude: number | null;
  }[];
  moodBreakdown: { name: string; percent: number }[];
  bookingsTimeline: { _id: string; count: number }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardStats>("/admin/stats")
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.message ?? "Failed to load dashboard"));
  }, []);

  return (
    <div>
      <Topbar title="Travel Command Center" subtitle="Real-time insights. Smarter journeys." showRangePicker />

      <div className="space-y-6 p-8">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total travelers" value={stats?.totals.users ?? "—"} icon={Users} tone="teal" />
          <StatCard label="Bookings this week" value={stats?.totals.bookingsThisWeek ?? "—"} icon={CalendarClock} tone="navy" />
          <StatCard
            label="Revenue collected"
            value={stats ? `$${stats.totals.revenue.toLocaleString()}` : "—"}
            icon={Wallet}
            tone="amber"
          />
          <StatCard label="Ongoing traveler trips" value={stats?.totals.liveTrips ?? "—"} icon={PlaneTakeoff} tone="rose" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — map + timeline */}
          <div className="space-y-6 lg:col-span-2">
            <div className="admin-panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlaneTakeoff className="h-4 w-4 text-navy-900" />
                  <div>
                    <h3 className="text-base font-semibold text-ink">Global Destinations Overview</h3>
                    <p className="text-sm text-ink-muted">Booking volume intensity (published destinations)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink-muted">
                    <Compass className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <WorldMap destinations={stats?.topDestinations ?? []} />
            </div>

            <div className="admin-panel p-6">
              <h3 className="text-base font-semibold text-ink">Booking journey timeline</h3>
              <p className="mb-4 text-sm text-ink-muted">New bookings created over the last 7 days</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.bookingsTimeline ?? []}>
                    <defs>
                      <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#127E83" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#127E83" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#d1e8ea" vertical={false} />
                    <XAxis dataKey="_id" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#127E83" strokeWidth={2} fill="url(#bookingGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right column — funnel, capacity, mood, live trips */}
          <div className="space-y-6">
            <div className="admin-panel p-6">
              <h3 className="mb-4 text-base font-semibold text-ink">Passport verification funnel</h3>
              {stats ? (
                <VerificationFunnel
                  unverified={stats.verificationFunnel.unverified}
                  pending={stats.verificationFunnel.pending}
                  verified={stats.verificationFunnel.verified}
                />
              ) : (
                <p className="text-sm text-ink-soft">Loading…</p>
              )}
            </div>

            <div className="admin-panel p-6">
              <h3 className="mb-4 text-base font-semibold text-ink">Package seat occupancy (Top 3)</h3>
              <div className="flex flex-wrap justify-center gap-4">
                {stats?.topDestinations.slice(0, 3).map((dest, i) => (
                  <ProgressRing key={dest.id} percent={dest.occupancy} label={dest.city || dest.title} colorIndex={i} />
                ))}
                {stats && stats.topDestinations.length === 0 ? (
                  <p className="text-sm text-ink-soft">No destinations yet.</p>
                ) : null}
              </div>
            </div>

            <div className="admin-panel p-6">
              <h3 className="mb-2 text-base font-semibold text-ink">Destination mood mix</h3>
              <MoodArcGauge data={stats?.moodBreakdown ?? []} />
            </div>

            <div className="admin-panel p-6 text-center">
              <h3 className="mb-4 text-left text-base font-semibold text-ink">Ongoing traveler trips</h3>
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-teal-400/50">
                <PlaneTakeoff className="h-7 w-7 text-teal-600" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-ink">{stats?.totals.liveTrips ?? "—"}</p>
              <p className="text-sm text-ink-muted">Trips in progress</p>
              <Link
                href="/admin/bookings"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                View all live trips <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
