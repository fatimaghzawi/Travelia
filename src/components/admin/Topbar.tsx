"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, ChevronDown, Calendar } from "lucide-react";
import { api } from "@/lib/api/client";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Show the "This Week" style range picker (dashboard only). */
  showRangePicker?: boolean;
}

const RANGE_OPTIONS = ["Today", "This Week", "This Month", "This Year"];

export function Topbar({
  title,
  subtitle,
  actions,
  showRangePicker = false,
}: TopbarProps) {
  const { data: session } = useSession();
  const [hasUnread, setHasUnread] = useState(false);
  const [range, setRange] = useState("This Week");
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/notifications", { isRead: "false", limit: 1 })
      .then(({ meta }) =>
        setHasUnread(Boolean(meta && (meta.total as number) > 0))
      )
      .catch(() => setHasUnread(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setRangeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d1e8ea] bg-[#F4FAFB]/95 px-3.5 py-3 shadow-[0_8px_24px_rgba(1,42,62,0.06)] backdrop-blur-md sm:gap-4 sm:px-6 sm:py-4">
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
                onClick={() => setRangeOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[#d1e8ea] bg-white px-2.5 py-2 text-xs font-medium text-ink transition hover:border-teal-400 hover:text-teal-600 sm:px-3.5 sm:text-sm"
              >
                <Calendar className="h-4 w-4 text-teal-600" />
                <span className="hidden sm:inline">{range}</span>
                <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
              </button>
              {rangeOpen ? (
                <div className="absolute right-0 z-10 mt-1.5 w-40 overflow-hidden rounded-2xl border border-[#e8eef0] bg-white py-1 shadow-[0_12px_32px_rgba(1,42,62,0.14)]">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setRange(opt);
                        setRangeOpen(false);
                      }}
                      className={`block w-full px-3.5 py-2 text-left text-sm transition hover:bg-surface-muted ${
                        opt === range
                          ? "font-medium text-teal-600"
                          : "text-ink"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1e8ea] bg-white text-ink-muted transition hover:text-teal-600"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnread ? (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
            ) : null}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-[#d1e8ea] bg-white py-1 pr-2 pl-1 sm:gap-2.5 sm:pr-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy-900 to-teal-600 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden max-w-[8rem] truncate text-sm font-medium text-ink sm:inline">
              {displayName}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-ink-soft sm:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
