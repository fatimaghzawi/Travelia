"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bell,
  Calendar,
  CheckCheck,
  ChevronDown,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useDocumentTheme } from "@/hooks/useDocumentTheme";
import {
  STATS_PERIOD_LABELS,
  type StatsPeriod,
} from "@/lib/admin/stats-period";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Show the period range picker (dashboard only). */
  showRangePicker?: boolean;
  range?: StatsPeriod;
  onRangeChange?: (period: StatsPeriod) => void;
}

type NavNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  link: string | null;
};

const RANGE_OPTIONS = Object.entries(STATS_PERIOD_LABELS) as [
  StatsPeriod,
  string,
][];

function formatRelative(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Topbar({
  title,
  subtitle,
  actions,
  showRangePicker = false,
  range = "week",
  onRangeChange,
}: TopbarProps) {
  const { data: session } = useSession();
  const { theme, cycleTheme } = useDocumentTheme();
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifId = useId();

  async function loadNotifications() {
    try {
      const { data, meta } = await api.get<
        Array<{
          _id: string;
          title: string;
          message: string;
          isRead: boolean;
          link?: string | null;
          createdAt: string;
        }>
      >("/notifications", { limit: 8, scope: "me" });
      setNotifications(
        (data ?? []).map((n) => ({
          id: String(n._id),
          title: n.title,
          body: n.message,
          time: formatRelative(n.createdAt),
          unread: !n.isRead,
          link: n.link ?? null,
        }))
      );
      setUnreadCount(Number(meta?.unreadCount ?? 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    if (notifOpen) void loadNotifications();
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rangeRef.current && !rangeRef.current.contains(target)) {
        setRangeOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    try {
      await api.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }

  async function openNotification(item: NavNotification) {
    if (item.unread) {
      try {
        await api.patch(`/notifications/${item.id}`, { isRead: true });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, unread: false } : n
          )
        );
        setUnreadCount((u) => Math.max(0, u - 1));
      } catch {
        /* ignore */
      }
    }
    setNotifOpen(false);
  }

  const displayName = session?.user?.name?.trim() || "Admin";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted/95 px-3.5 py-3 shadow-[0_8px_24px_rgba(1,42,62,0.06)] backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-ink-muted sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {actions}

          {showRangePicker ? (
            <div className="relative" ref={rangeRef}>
              <button
                type="button"
                onClick={() => {
                  setRangeOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-2 text-xs font-medium text-ink transition hover:border-teal-400 hover:text-teal-600 sm:px-3.5 sm:text-sm"
              >
                <Calendar className="h-4 w-4 text-teal-600" />
                <span className="hidden sm:inline">
                  {STATS_PERIOD_LABELS[range]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
              </button>
              {rangeOpen ? (
                <div className="absolute right-0 z-10 mt-1.5 w-40 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-[0_12px_32px_rgba(1,42,62,0.14)]">
                  {RANGE_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        onRangeChange?.(value);
                        setRangeOpen(false);
                      }}
                      className={`block w-full px-3.5 py-2 text-left text-sm transition hover:bg-surface-muted ${
                        value === range
                          ? "font-medium text-teal-600"
                          : "text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={cycleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition hover:text-teal-600"
            aria-label={`Theme: ${theme}. Change theme`}
            title={
              theme === "light"
                ? "Light theme — tap for dark"
                : theme === "dark"
                  ? "Dark theme — tap for system"
                  : "System theme — tap for light"
            }
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : theme === "system" ? (
              <Monitor className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition hover:text-teal-600"
              aria-expanded={notifOpen}
              aria-controls={notifId}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              onClick={() => {
                setNotifOpen((open) => !open);
                setRangeOpen(false);
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-surface" />
              ) : null}
            </button>

            {notifOpen ? (
              <div
                id={notifId}
                role="menu"
                className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_40px_rgba(1,42,62,0.14)]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Notifications
                    </p>
                    <p className="text-xs text-ink-muted">
                      {unreadCount} unread
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    disabled={unreadCount === 0}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-medium text-teal-600 disabled:opacity-40"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all
                  </button>
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-8 text-center text-xs text-ink-muted">
                      No notifications yet
                    </li>
                  ) : (
                    notifications.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.link || "/admin/notifications"}
                          role="menuitem"
                          className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface-muted"
                          onClick={() => void openNotification(item)}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              item.unread ? "bg-teal-500" : "bg-transparent"
                            }`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-ink">
                                {item.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-ink-soft">
                                {item.time}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              {item.body}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
                <div className="border-t border-border px-4 py-2.5">
                  <Link
                    href="/admin/notifications"
                    className="text-sm font-medium text-teal-600 hover:underline"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-2 pl-1 sm:gap-2.5 sm:pr-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy-900 to-teal-600 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink sm:inline">
              {displayName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
