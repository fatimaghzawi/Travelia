"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Compass,
  LayoutGrid,
  Smile,
  ClipboardList,
  CreditCard,
  Star,
  Megaphone,
  Bell,
  Settings,
  Briefcase,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/destinations", label: "Destinations", icon: MapPin },
  { href: "/admin/trip-packages", label: "Trip Packages", icon: Briefcase },
  { href: "/admin/activities", label: "Activities", icon: Compass },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/moods", label: "Moods", icon: Smile },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/announcements", label: "Advertisements", icon: Megaphone },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#d1e8ea] bg-[#F4FAFB]/95 px-3 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1e8ea] bg-white text-[#012A3E]"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" aria-label="Travelia admin home">
          <Logo
            size="sm"
            className="justify-start [&_img]:!w-[110px] [&_img]:!max-h-8"
          />
        </Link>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close admin menu"
          className="fixed inset-0 z-40 bg-[#012A3E]/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(16rem,86vw)] shrink-0 flex-col bg-navy-900 text-white shadow-[8px_0_32px_rgba(1,42,62,0.18)] transition-transform duration-200 ease-out lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <Link
            href="/admin"
            className="flex min-w-0 flex-1 items-center rounded-2xl border border-[#d1e8ea]/80 bg-[#F4FAFB] px-3 py-3 shadow-[0_6px_18px_rgba(1,42,62,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
            aria-label="Travelia admin home"
          >
            <Logo
              size="sm"
              className="justify-start [&_img]:!w-[118px] [&_img]:!max-h-8"
            />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="admin-scroll flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 pt-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white shadow-[0_8px_20px_rgba(18,126,131,0.35)]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive ? "text-[#9aebed]" : "text-teal-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          {session?.user?.email ? (
            <p className="mb-2 truncate px-1 text-xs text-white/50">
              {session.user.email}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
