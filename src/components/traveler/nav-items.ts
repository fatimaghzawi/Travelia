import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Compass,
  Map,
  Ticket,
  MapPinned,
  Star,
} from "lucide-react";

export type TravelerNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  exact?: boolean;
};

/** Primary traveler destinations for the dashboard navbar. */
export const TRAVELER_NAV_ITEMS: TravelerNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/destinations",
    label: "Destinations",
    shortLabel: "Explore",
    icon: Compass,
  },
  {
    href: "/dashboard/trips",
    label: "My Trips",
    shortLabel: "Trips",
    icon: Map,
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    shortLabel: "Bookings",
    icon: Ticket,
  },
  {
    href: "/dashboard/visited",
    label: "Visited places",
    shortLabel: "Visited",
    icon: MapPinned,
  },
  {
    href: "/dashboard/reviews",
    label: "Reviews",
    shortLabel: "Reviews",
    icon: Star,
  },
];
