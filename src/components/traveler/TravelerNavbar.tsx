"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Heart,
  Images,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  X,
  Globe2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Logo } from "@/components/ui/Logo";
import { TRAVELER_NAV_ITEMS } from "@/components/traveler/nav-items";
import { useTravelerPreferences } from "@/components/traveler/preferences/TravelerPreferencesProvider";
import { api } from "@/lib/api/client";

const DestinationsMapQuickView = dynamic(
  () =>
    import("@/components/traveler/DestinationsMapQuickView").then(
      (m) => m.DestinationsMapQuickView
    ),
  { ssr: false }
);

export type TravelerNavUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type NavNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  link: string | null;
};

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

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function userInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "T";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function TravelerNavbar({
  initialUser = null,
}: {
  /** Server-resolved session user from the traveler layout. */
  initialUser?: TravelerNavUser | null;
}) {
  const pathname = usePathname();
  const user = initialUser;
  const isGuest = !user;
  const navItems = isGuest
    ? TRAVELER_NAV_ITEMS.filter((item) => item.href === "/destinations")
    : TRAVELER_NAV_ITEMS;
  const { prefs, setCurrency, setTheme } = useTravelerPreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Client-only portals without a mount-effect setState (avoids React 19 warning)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const skipPathClose = useRef(true);
  const drawerId = useId();
  const notifId = useId();
  const accountId = useId();

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
      // keep empty inbox on error
    }
  }

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
  }, [user]);

  useEffect(() => {
    if (notifOpen && user) void loadNotifications();
  }, [notifOpen, user]);

  async function markAllRead() {
    try {
      await api.post("/notifications/mark-all-read");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, unread: false }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
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
        // ignore
      }
    }
    setNotifOpen(false);
  }

  useEffect(() => {
    if (skipPathClose.current) {
      skipPathClose.current = false;
      return;
    }
    setDrawerOpen(false);
    setNotifOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setNotifOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!notifRef.current?.contains(target)) setNotifOpen(false);
      if (!accountRef.current?.contains(target)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!drawerOpen && !notifOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen, notifOpen]);

  const drawer =
    mounted && drawerOpen
      ? createPortal(
          <div className="lg:hidden">
            <button
              type="button"
              className="fixed inset-0 z-[200] bg-[#012A3E]/45"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            />

            <aside
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fixed inset-y-0 left-0 z-[210] flex h-dvh w-[min(20rem,86vw)] flex-col bg-white shadow-[12px_0_40px_rgba(1,42,62,0.22)]"
            >
              <div className="flex items-center justify-between border-b border-[#e8eef0] px-4 py-3">
                <p className="text-sm font-semibold text-[#012A3E]">Menu</p>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e8f0] text-[#012A3E]"
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <nav
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
                aria-label="Traveler menu"
              >
                <ul className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const active = isActivePath(
                      pathname,
                      item.href,
                      item.exact
                    );
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={[
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                            active
                              ? "bg-[#012A3E] text-white"
                              : "text-[#012A3E] hover:bg-[#F4FAFB]",
                          ].join(" ")}
                          onClick={() => setDrawerOpen(false)}
                        >
                          <span
                            className={[
                              "inline-flex h-9 w-9 items-center justify-center rounded-lg",
                              active
                                ? "bg-white/10 text-[#34BDAF]"
                                : "bg-[#F4FAFB] text-[#127E83]",
                            ].join(" ")}
                          >
                            <Icon size={18} strokeWidth={2.1} />
                          </span>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="border-t border-[#e8eef0] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-[#F4FAFB] px-3 py-2 sm:hidden">
                  <span className="text-xs font-medium text-[#67717A]">Theme</span>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#012A3E]"
                    aria-label={`Theme: ${prefs.theme}. Change theme`}
                    onClick={() => {
                      const next =
                        prefs.theme === "light"
                          ? "dark"
                          : prefs.theme === "dark"
                            ? "system"
                            : "light";
                      setTheme(next);
                    }}
                  >
                    {prefs.theme === "dark" ? (
                      <Moon size={18} strokeWidth={1.75} />
                    ) : prefs.theme === "system" ? (
                      <Monitor size={18} strokeWidth={1.75} />
                    ) : (
                      <Sun size={18} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
                {isGuest ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(pathname || "/destinations")}`}
                      className="inline-flex w-full items-center justify-center rounded-full border border-[#d1e8ea] bg-white px-4 py-2.5 text-sm font-semibold text-[#012A3E] transition hover:bg-[#F4FAFB]"
                      onClick={() => setDrawerOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f6b6f]"
                      onClick={() => setDrawerOpen(false)}
                    >
                      <Sparkles size={15} />
                      Plan a trip
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/dashboard/trips"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f6b6f]"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Sparkles size={15} />
                    Plan a trip
                  </Link>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header className="traveler-navbar sticky top-0 z-50 bg-transparent px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="traveler-navbar__bar mx-auto flex h-12 w-full max-w-7xl items-center gap-1.5 rounded-2xl border border-[#d1e8ea] bg-[#F4FAFB] px-2 shadow-[0_8px_24px_rgba(1,42,62,0.06)] sm:h-16 sm:gap-3 sm:px-5">
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#012A3E] transition hover:bg-white hover:text-[#127E83] sm:h-10 sm:w-10 lg:hidden"
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setDrawerOpen((open) => !open);
              setNotifOpen(false);
              setAccountOpen(false);
            }}
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link
            href={isGuest ? "/" : "/dashboard"}
            className="min-w-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#127E83] focus-visible:ring-offset-2"
            aria-label={isGuest ? "Travelia home" : "Travelia dashboard home"}
          >
            <Logo
              size="sm"
              className="justify-start [&_img]:!w-[88px] sm:[&_img]:!w-[140px]"
            />
          </Link>

          <nav
            className="ml-1 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden"
            aria-label="Traveler dashboard"
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={[
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition xl:gap-2 xl:px-2.5 xl:text-sm",
                    active
                      ? "bg-white text-[#127E83] shadow-sm"
                      : "text-[#012A3E] hover:bg-white/80 hover:text-[#127E83]",
                  ].join(" ")}
                >
                  <Icon
                    size={15}
                    strokeWidth={2.1}
                    className={active ? "text-[#127E83]" : "text-[#127E83]/80"}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <button
              type="button"
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-[10px] font-bold tracking-wide text-[#012A3E] transition hover:bg-[#F4FAFB] hover:text-[#127E83] sm:h-10 sm:min-w-10 sm:px-1.5 sm:text-[11px]"
              aria-label={
                prefs.currency === "USD"
                  ? "Switch currency to Lebanese Lira"
                  : "Switch currency to US dollars"
              }
              title={
                prefs.currency === "USD"
                  ? "Currency: USD — tap for LBP"
                  : "Currency: LBP — tap for USD"
              }
              onClick={() =>
                setCurrency(prefs.currency === "USD" ? "LBP" : "USD")
              }
            >
              {prefs.currency === "USD" ? "$" : "ل.ل."}
            </button>

            <button
              type="button"
              className="hidden h-8 w-8 items-center justify-center text-[#012A3E] transition hover:text-[#127E83] sm:inline-flex sm:h-10 sm:w-10"
              aria-label={`Theme: ${prefs.theme}. Change theme`}
              title={
                prefs.theme === "light"
                  ? "Light theme — tap for dark"
                  : prefs.theme === "dark"
                    ? "Dark theme — tap for system"
                    : "System theme — tap for light"
              }
              onClick={() => {
                const next =
                  prefs.theme === "light"
                    ? "dark"
                    : prefs.theme === "dark"
                      ? "system"
                      : "light";
                setTheme(next);
              }}
            >
              {prefs.theme === "dark" ? (
                <Moon size={20} strokeWidth={1.75} />
              ) : prefs.theme === "system" ? (
                <Monitor size={20} strokeWidth={1.75} />
              ) : (
                <Sun size={20} strokeWidth={1.75} />
              )}
            </button>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center text-[#51A5D6] transition hover:text-[#1d6f9a] sm:h-10 sm:w-10"
              aria-label="Open destinations map"
              title="Destinations map"
              onClick={() => {
                setMapOpen(true);
                setNotifOpen(false);
                setAccountOpen(false);
                setDrawerOpen(false);
              }}
            >
              <Globe2 size={20} strokeWidth={1.75} />
            </button>

            {isGuest ? (
              <>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(pathname || "/destinations")}`}
                  className="hidden text-sm font-semibold text-[#012A3E] transition hover:text-[#127E83] sm:inline-flex"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-[#127E83] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0f6b6f] sm:px-4 sm:text-sm"
                >
                  Plan a trip
                </Link>
              </>
            ) : (
              <>
            <Link
              href="/dashboard/favorites"
              className="inline-flex h-8 w-8 items-center justify-center text-[#012A3E] transition hover:text-[#127E83] sm:h-10 sm:w-10"
              aria-label="Favorites"
              title="Favorites"
            >
              <Heart size={20} strokeWidth={1.75} />
            </Link>

            <Link
              href="/dashboard/gallery"
              className="inline-flex h-8 w-8 items-center justify-center text-[#012A3E] transition hover:text-[#127E83] sm:h-10 sm:w-10"
              aria-label="Gallery"
              title="Gallery"
            >
              <Images size={20} strokeWidth={1.75} />
            </Link>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="relative inline-flex h-8 w-8 items-center justify-center text-[#012A3E] transition hover:text-[#127E83] sm:h-10 sm:w-10"
                aria-expanded={notifOpen}
                aria-controls={notifId}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                onClick={() => {
                  setNotifOpen((open) => !open);
                  setDrawerOpen(false);
                  setAccountOpen(false);
                }}
              >
                <Bell size={20} strokeWidth={1.75} />
                {unreadCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#127E83] ring-2 ring-white" />
                ) : null}
              </button>

              {notifOpen ? (
                <div
                  id={notifId}
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#e8eef0] bg-white shadow-[0_18px_40px_rgba(1,42,62,0.14)]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[#e8eef0] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#012A3E]">
                        Notifications
                      </p>
                      <p className="text-xs text-[#67717A]">
                        {unreadCount} unread
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      disabled={unreadCount === 0}
                      className="inline-flex items-center gap-1 rounded-full bg-[#F4FAFB] px-2 py-1 text-[11px] font-medium text-[#127E83] disabled:opacity-40"
                    >
                      <CheckCheck size={12} />
                      Mark all
                    </button>
                  </div>
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                      <li className="px-4 py-8 text-center text-xs text-[#67717A]">
                        No notifications yet
                      </li>
                    ) : (
                      notifications.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.link || "/dashboard/notifications"}
                            role="menuitem"
                            className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-[#F4FAFB]"
                            onClick={() => void openNotification(item)}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                item.unread ? "bg-[#127E83]" : "bg-transparent"
                              }`}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold text-[#012A3E]">
                                  {item.title}
                                </span>
                                <span className="shrink-0 text-[11px] text-[#94A3B8]">
                                  {item.time}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-xs text-[#67717A]">
                                {item.body}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="border-t border-[#e8eef0] px-4 py-2.5">
                    <Link
                      href="/dashboard/notifications"
                      className="text-sm font-medium text-[#127E83] hover:underline"
                      onClick={() => setNotifOpen(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <span
              className="mx-1.5 h-6 w-px bg-[#e2e8f0] sm:mx-2"
              aria-hidden
            />

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1 text-[#012A3E] transition hover:text-[#127E83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#127E83] focus-visible:ring-offset-2"
                aria-expanded={accountOpen}
                aria-controls={accountId}
                aria-haspopup="menu"
                aria-label="Account menu"
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setNotifOpen(false);
                  setDrawerOpen(false);
                }}
              >
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-[#d1e8ea] sm:h-9 sm:w-9"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#012A3E] to-[#127E83] text-[11px] font-semibold text-white sm:h-9 sm:w-9 sm:text-xs">
                    {userInitials(user?.name, user?.email)}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  className={`shrink-0 transition ${accountOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {accountOpen ? (
                <div
                  id={accountId}
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[#e8eef0] bg-white py-1 shadow-[0_12px_32px_rgba(1,42,62,0.14)]"
                >
                  <div className="border-b border-[#e8eef0] px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-[#012A3E]">
                      {user?.name || "Traveler"}
                    </p>
                    <p className="truncate text-xs text-[#67717A]">
                      {user?.email || ""}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#012A3E] transition hover:bg-[#F4FAFB]"
                    onClick={() => setAccountOpen(false)}
                  >
                    <UserRound size={16} className="text-[#127E83]" />
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/trips"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#012A3E] transition hover:bg-[#F4FAFB]"
                    onClick={() => setAccountOpen(false)}
                  >
                    <Sparkles size={16} className="text-[#127E83]" />
                    Plan a trip
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#012A3E] transition hover:bg-[#F4FAFB]"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut size={16} className="text-[#127E83]" />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
              </>
            )}
          </div>
        </div>
      </header>

      {drawer}
      {mapOpen ? (
        <DestinationsMapQuickView
          open={mapOpen}
          onClose={() => setMapOpen(false)}
        />
      ) : null}
    </>
  );
}
