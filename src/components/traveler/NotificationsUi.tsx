"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Megaphone,
  Plane,
  ShieldCheck,
  Ticket,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api/client";

export type InboxNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

type NotificationsUiProps = {
  initialItems: InboxNotification[];
  initialUnread: number;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeMeta(type: string) {
  if (type === "booking")
    return { icon: Ticket, label: "Booking", tone: "bg-[#C48A1A]/12 text-[#9a6c12]" };
  if (type === "trip")
    return { icon: Plane, label: "Trip", tone: "bg-[#127E83]/12 text-[#127E83]" };
  if (type === "verification")
    return {
      icon: ShieldCheck,
      label: "Verification",
      tone: "bg-[#012A3E]/8 text-[#012A3E]",
    };
  if (type === "announcement" || type === "promotion")
    return {
      icon: Megaphone,
      label: "Announcement",
      tone: "bg-[#E4574A]/12 text-[#E4574A]",
    };
  return { icon: Bell, label: "Update", tone: "bg-[#e8eef0] text-[#67717A]" };
}

export function NotificationsUi({
  initialItems,
  initialUnread,
}: NotificationsUiProps) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.isRead);
    return items;
  }, [items, filter]);

  function markRead(id: string) {
    startTransition(async () => {
      try {
        await api.patch(`/notifications/${id}`, { isRead: true });
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        // keep UI stable
      }
    });
  }

  function markAll() {
    startTransition(async () => {
      try {
        await api.post("/notifications/mark-all-read");
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
      } catch {
        // ignore
      }
    });
  }

  function removeOne(id: string) {
    startTransition(async () => {
      const target = items.find((n) => n.id === id);
      try {
        await api.delete(`/notifications/${id}`);
        setItems((prev) => prev.filter((n) => n.id !== id));
        if (target && !target.isRead) setUnread((u) => Math.max(0, u - 1));
      } catch {
        // ignore
      }
    });
  }

  return (
    <div className="traveler-dashboard trips-list">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#012A3E]">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-[#67717A] sm:text-base">
            Booking updates, trip notes, verification, and Travelia announcements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-[#F4FAFB] p-1 ring-1 ring-[#e8eef0]">
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === id
                    ? "bg-[#012A3E] text-white"
                    : "text-[#67717A] hover:text-[#012A3E]"
                }`}
              >
                {label}
                {id === "unread" && unread > 0 ? ` · ${unread}` : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={markAll}
            disabled={pending || unread === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#127E83] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d1e8ea] bg-white px-6 py-14 text-center">
          <Bell className="mx-auto h-8 w-8 text-[#94A3B8]" />
          <p className="mt-3 text-base font-medium text-[#012A3E]">
            {filter === "unread" ? "You’re all caught up" : "No notifications yet"}
          </p>
          <p className="mt-1.5 text-sm text-[#67717A]">
            We’ll ping you here — and by email — when something happens on your trips.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.map((item) => {
            const meta = typeMeta(item.type);
            const Icon = meta.icon;
            const href = item.link || "/dashboard";
            return (
              <li key={item.id}>
                <article
                  className={`flex gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(1,42,62,0.04)] ring-1 transition ${
                    item.isRead
                      ? "ring-[#e8eef0]"
                      : "ring-[#127E83]/25 bg-[#F4FAFB]"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
                        {meta.label}
                      </span>
                      {!item.isRead ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E4574A]" />
                      ) : null}
                      <span className="text-[11px] text-[#94A3B8]">
                        {formatWhen(item.createdAt)}
                      </span>
                    </div>
                    <h2 className="mt-1 font-semibold text-[#012A3E]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-[#67717A]">
                      {item.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={href}
                        onClick={() => {
                          if (!item.isRead) markRead(item.id);
                        }}
                        className="inline-flex rounded-lg bg-[#012A3E] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Open
                      </Link>
                      {!item.isRead ? (
                        <button
                          type="button"
                          onClick={() => markRead(item.id)}
                          className="inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-[#127E83] hover:bg-[#127E83]/10"
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeOne(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#94A3B8] hover:bg-[#F4FAFB] hover:text-[#E4574A]"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
