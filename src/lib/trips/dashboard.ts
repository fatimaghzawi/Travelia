import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import {
  Announcement,
  Booking,
  Checklist,
  Expense,
  Favorite,
  Notification,
  Trip,
  TripJournal,
  User,
  VisitedPlace,
} from "@/models";
import { syncTravelerTrips } from "@/lib/trips/promote";

export type DashboardTrip = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  thumbnail: string | null;
  place: string | null;
  city: string | null;
  country: string | null;
  daysUntil: number | null;
  totalBudget: number;
  spent: number;
  remaining: number;
  progress: number;
  stage:
    | "planning"
    | "booked"
    | "packing"
    | "flying"
    | "exploring"
    | "completed";
};

export type DashboardAnnouncement = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  source: "broadcast" | "inbox";
  isRead: boolean;
};

export type DashboardCalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  kind: "trip" | "booking";
  href: string;
  place: string | null;
};

export type DashboardStats = {
  upcomingTrips: number;
  ongoingTrips: number;
  openBookings: number;
  visitedPlaces: number;
  unreadAnnouncements: number;
  countries: number;
  cities: number;
  completedTrips: number;
  totalSpent: number;
  totalBudget: number;
  packingProgress: number;
  explorerLevel: number;
  adventureScore: number;
  travelStreak: number;
};

export type DashboardJournalMemory = {
  id: string;
  tripId: string;
  tripTitle: string;
  dayKey: string;
  photos: string[];
  memory: string | null;
  mood: string | null;
  place: string | null;
};

export type DashboardPackingItem = {
  id: string;
  text: string;
  completed: boolean;
  checklistTitle: string;
  tripId: string;
};

export type DashboardWishlistItem = {
  id: string;
  destinationId: string;
  title: string;
  city: string | null;
  country: string | null;
  thumbnail: string | null;
  slug: string | null;
  estimatedBudget: number | null;
};

export type DashboardBookingCard = {
  id: string;
  title: string;
  place: string | null;
  thumbnail: string | null;
  travelDate: string;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  canCancel: boolean;
};

export type DashboardExpenseSlice = {
  category: string;
  amount: number;
};

export type DashboardPassport = {
  status: "unverified" | "pending" | "verified" | "rejected";
  isVerified: boolean;
  nationality: string | null;
  expiry: string | null;
};

export type DashboardInsight = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "teal" | "navy" | "sky" | "coral";
};

export type TravelerDashboardData = {
  firstName: string;
  stats: DashboardStats;
  heroTrip: DashboardTrip | null;
  upcomingTrips: DashboardTrip[];
  timelineTrips: DashboardTrip[];
  announcements: DashboardAnnouncement[];
  calendarEvents: DashboardCalendarEvent[];
  journal: DashboardJournalMemory[];
  packing: DashboardPackingItem[];
  wishlist: DashboardWishlistItem[];
  recentBookings: DashboardBookingCard[];
  expensesByCategory: DashboardExpenseSlice[];
  passport: DashboardPassport;
  insights: DashboardInsight[];
  visitedCountries: string[];
  quote: { text: string; author: string };
};

type DestLean = {
  _id?: unknown;
  title?: string;
  city?: string;
  country?: string;
  thumbnail?: string | null;
  slug?: string | null;
  estimatedBudget?: number;
  latitude?: number;
  longitude?: number;
};

type PkgLean = {
  departureDate?: Date | string;
  returnDate?: Date | string;
  title?: string;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function safeIso(value: unknown) {
  const d = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function money(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isDest(value: unknown): value is DestLean {
  if (!value || typeof value !== "object") return false;
  if ("_bsontype" in value) return false;
  // Populated docs have fields; bare ObjectIds do not
  return "title" in value || "city" in value || "slug" in value;
}

function isPkg(value: unknown): value is PkgLean {
  if (!value || typeof value !== "object") return false;
  if ("_bsontype" in value) return false;
  return "departureDate" in value || "returnDate" in value || "title" in value;
}

function daysUntil(iso: string, today = startOfDay()) {
  const start = startOfDay(new Date(iso));
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

function deriveStage(
  status: string,
  startIso: string,
  endIso: string,
  today = startOfDay()
): DashboardTrip["stage"] {
  if (status === "completed") return "completed";
  if (status === "ongoing") return "exploring";
  if (status === "planning") return "planning";
  const until = daysUntil(startIso, today);
  const endUntil = daysUntil(endIso, today);
  if (until <= 0 && endUntil >= 0) return "exploring";
  if (until <= 1 && until >= 0) return "flying";
  if (until <= 14) return "packing";
  if (status === "upcoming") return "booked";
  return "planning";
}

function tripProgress(stage: DashboardTrip["stage"]) {
  const order = [
    "planning",
    "booked",
    "packing",
    "flying",
    "exploring",
    "completed",
  ] as const;
  const idx = order.indexOf(stage);
  return Math.round(((idx + 1) / order.length) * 100);
}

const QUOTES = [
  {
    text: "The world is a book, and those who do not travel read only one page.",
    author: "Saint Augustine",
  },
  {
    text: "Travel makes one modest. You see what a tiny place you occupy in the world.",
    author: "Gustave Flaubert",
  },
  {
    text: "Jobs fill your pocket, but adventures fill your soul.",
    author: "Jamie McGuire",
  },
  {
    text: "We travel not to escape life, but for life not to escape us.",
    author: "Anonymous",
  },
];

export async function loadTravelerDashboard(
  userId: string,
  displayName?: string | null
): Promise<TravelerDashboardData> {
  await connectDB();
  try {
    await syncTravelerTrips(userId);
  } catch (error) {
    console.warn("[dashboard] syncTravelerTrips skipped", error);
  }

  const uid = new mongoose.Types.ObjectId(userId);
  const today = startOfDay();
  const firstName = displayName?.trim().split(/\s+/)[0] || "Traveler";

  const [
    trips,
    bookings,
    broadcasts,
    inbox,
    visits,
    journals,
    checklists,
    favorites,
    user,
    expenses,
  ] = await Promise.all([
    Trip.find({
      userId: uid,
      status: { $in: ["planning", "upcoming", "ongoing", "completed"] },
    })
      .populate(
        "destinationId",
        "title city country thumbnail slug latitude longitude"
      )
      .sort({ startDate: 1 })
      .lean(),
    Booking.find({
      userId: uid,
      status: { $in: ["pending", "confirmed", "completed", "cancelled"] },
    })
      .populate("tripPackageId", "title departureDate returnDate")
      .populate("destinationId", "title city country thumbnail")
      .populate("activityId", "title")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    Announcement.find({
      isActive: true,
      audience: { $in: ["all", "TRAVELER"] },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Notification.find({ userId: uid, type: "announcement" })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    VisitedPlace.find({ userId: uid })
      .populate("destinationId", "title city country thumbnail")
      .lean(),
    TripJournal.find({ userId: uid }).sort({ dayKey: -1 }).limit(24).lean(),
    Checklist.find({ userId: uid }).sort({ updatedAt: -1 }).limit(8).lean(),
    Favorite.find({ userId: uid })
      .populate(
        "destinationId",
        "title slug city country thumbnail estimatedBudget"
      )
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    User.findById(uid)
      .select("passport isVerified verificationStatus")
      .lean(),
    Expense.find({ userId: uid }).sort({ date: -1 }).limit(200).lean(),
  ]);

  const tripIds = trips.map((t) => t._id);
  const spentRows =
    tripIds.length > 0
      ? await Expense.aggregate<{ _id: unknown; total: number }>([
          { $match: { tripId: { $in: tripIds }, userId: uid } },
          { $group: { _id: "$tripId", total: { $sum: "$amount" } } },
        ])
      : [];
  const spentByTrip = new Map(
    spentRows.map((r) => [String(r._id), money(r.total)])
  );

  const tripTitleById = new Map(
    trips.map((t) => [String(t._id), t.title || "Trip"])
  );

  const allTrips: DashboardTrip[] = trips.map((trip) => {
    const destRaw = trip.destinationId as unknown;
    const dest = isDest(destRaw) ? destRaw : null;
    const startDate = safeIso(trip.startDate);
    const endDate = safeIso(trip.endDate);
    const status = String(trip.status);
    const until = daysUntil(startDate, today);
    const spent = spentByTrip.get(String(trip._id)) ?? 0;
    const totalBudget = money(trip.totalBudget);
    const stage = deriveStage(status, startDate, endDate, today);
    return {
      id: String(trip._id),
      title: trip.title || "Trip",
      status,
      startDate,
      endDate,
      thumbnail: dest?.thumbnail ?? trip.coverImage ?? null,
      place:
        [dest?.city, dest?.country].filter(Boolean).join(", ") ||
        dest?.title ||
        null,
      city: dest?.city ?? null,
      country: dest?.country ?? null,
      daysUntil: status === "ongoing" ? 0 : until >= 0 ? until : null,
      totalBudget,
      spent,
      remaining: Math.max(0, totalBudget - spent),
      progress: tripProgress(stage),
      stage,
    };
  });

  const upcomingTrips = allTrips
    .filter((t) => ["planning", "upcoming", "ongoing"].includes(t.status))
    .filter((t) => {
      const end = startOfDay(new Date(t.endDate));
      return end.getTime() >= today.getTime() || t.status === "ongoing";
    })
    .sort((a, b) => {
      if (a.status === "ongoing" && b.status !== "ongoing") return -1;
      if (b.status === "ongoing" && a.status !== "ongoing") return 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  const calendarEvents: DashboardCalendarEvent[] = allTrips.map((t) => ({
    id: `trip-${t.id}`,
    title: t.title,
    startDate: t.startDate,
    endDate: t.endDate,
    kind: "trip" as const,
    href: `/dashboard/trips/${t.id}`,
    place: t.place,
  }));

  const recentBookings: DashboardBookingCard[] = [];
  let openBookings = 0;

  for (const booking of bookings) {
    const pkg = isPkg(booking.tripPackageId) ? booking.tripPackageId : null;
    const destRaw = booking.destinationId as unknown;
    const dest = isDest(destRaw) ? destRaw : null;
    const activity =
      booking.activityId &&
      typeof booking.activityId === "object" &&
      "title" in booking.activityId
        ? (booking.activityId as { title?: string }).title
        : null;
    const start = pkg?.departureDate
      ? new Date(pkg.departureDate)
      : new Date(booking.travelDate);
    start.setHours(0, 0, 0, 0);
    const end = pkg?.returnDate ? new Date(pkg.returnDate) : start;
    end.setHours(0, 0, 0, 0);

    if (
      ["pending", "confirmed"].includes(String(booking.status)) &&
      end.getTime() >= today.getTime()
    ) {
      openBookings += 1;
      calendarEvents.push({
        id: `booking-${String(booking._id)}`,
        title: pkg?.title || dest?.title || activity || "Booking",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        kind: "booking",
        href: "/dashboard/bookings",
        place: [dest?.city, dest?.country].filter(Boolean).join(", ") || null,
      });
    }

    recentBookings.push({
      id: String(booking._id),
      title:
        pkg?.title ||
        activity ||
        dest?.title ||
        "Travel booking",
      place: [dest?.city, dest?.country].filter(Boolean).join(", ") || null,
      thumbnail: dest?.thumbnail ?? null,
      travelDate: start.toISOString(),
      status: String(booking.status),
      paymentStatus: String(booking.paymentStatus),
      price: money(booking.price),
      currency: booking.currency || "USD",
      canCancel:
        booking.status === "confirmed" &&
        booking.paymentStatus === "paid" &&
        start.getTime() > today.getTime(),
    });
  }

  const announcements: DashboardAnnouncement[] = [];
  const seenTitles = new Set<string>();
  for (const row of broadcasts) {
    const key = `${row.title}::${row.message}`.toLowerCase();
    seenTitles.add(key);
    announcements.push({
      id: `broadcast-${String(row._id)}`,
      title: row.title,
      message: row.message,
      createdAt: safeIso(row.createdAt),
      source: "broadcast",
      isRead: true,
    });
  }
  for (const note of inbox) {
    const key = `${note.title}::${note.message}`.toLowerCase();
    if (seenTitles.has(key)) continue;
    announcements.push({
      id: `inbox-${String(note._id)}`,
      title: note.title,
      message: note.message,
      createdAt: safeIso(note.createdAt),
      source: "inbox",
      isRead: Boolean(note.isRead),
    });
  }
  announcements.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const journal: DashboardJournalMemory[] = [];
  for (const entry of journals) {
    if (
      !entry.memory &&
      !(entry.photos?.length > 0) &&
      !(entry.places?.length > 0)
    ) {
      continue;
    }
    journal.push({
      id: String(entry._id),
      tripId: String(entry.tripId),
      tripTitle: tripTitleById.get(String(entry.tripId)) || "Trip",
      dayKey: entry.dayKey,
      photos: entry.photos ?? [],
      memory: entry.memory ?? null,
      mood: entry.mood ?? null,
      place: entry.places?.[0]?.name ?? null,
    });
    if (journal.length >= 3) break;
  }

  const packing: DashboardPackingItem[] = [];
  for (const list of checklists) {
    for (const item of list.items ?? []) {
      packing.push({
        id: String((item as { _id?: unknown })._id ?? `${list._id}-${item.text}`),
        text: item.text,
        completed: Boolean(item.completed),
        checklistTitle: list.title,
        tripId: String(list.tripId),
      });
    }
  }
  const packingDone = packing.filter((p) => p.completed).length;
  const packingProgress =
    packing.length > 0 ? Math.round((packingDone / packing.length) * 100) : 0;

  const wishlist: DashboardWishlistItem[] = favorites
    .map((f) => {
      const raw = f.destinationId as unknown;
      const dest = isDest(raw) ? raw : null;
      if (!dest?._id) return null;
      return {
        id: String(f._id),
        destinationId: String(dest._id),
        title: dest.title || "Destination",
        city: dest.city ?? null,
        country: dest.country ?? null,
        thumbnail: dest.thumbnail ?? null,
        slug: dest.slug ?? null,
        estimatedBudget:
          typeof dest.estimatedBudget === "number"
            ? dest.estimatedBudget
            : null,
      };
    })
    .filter(Boolean) as DashboardWishlistItem[];

  const expenseMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = String(e.category || "other");
    expenseMap.set(cat, (expenseMap.get(cat) ?? 0) + money(e.amount));
  }
  const expensesByCategory = [...expenseMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpent = expensesByCategory.reduce((s, x) => s + x.amount, 0);
  const totalBudget = allTrips.reduce((s, t) => s + t.totalBudget, 0);

  const visitedCountries = [
    ...new Set(
      visits
        .map((v) => {
          const d = isDest(v.destinationId as unknown) ? (v.destinationId as unknown as DestLean) : null;
          return d?.country?.trim() || null;
        })
        .filter(Boolean) as string[]
    ),
  ];
  const visitedCities = [
    ...new Set(
      visits
        .map((v) => {
          const d = isDest(v.destinationId as unknown) ? (v.destinationId as unknown as DestLean) : null;
          return d?.city?.trim() || null;
        })
        .filter(Boolean) as string[]
    ),
  ];

  const completedTrips = allTrips.filter((t) => t.status === "completed").length;
  const adventureScore = Math.min(
    100,
    completedTrips * 12 +
      visitedCountries.length * 8 +
      journal.length * 4 +
      Math.min(20, Math.round(totalSpent / 500))
  );
  const explorerLevel = Math.max(1, Math.floor(adventureScore / 20) + 1);

  // Streak: consecutive months with a trip overlapping
  let travelStreak = 0;
  const monthKeys = new Set(
    allTrips.map((t) => {
      const d = new Date(t.startDate);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  const cursor = new Date(today);
  while (
    monthKeys.has(`${cursor.getFullYear()}-${cursor.getMonth()}`) &&
    travelStreak < 24
  ) {
    travelStreak += 1;
    cursor.setMonth(cursor.getMonth() - 1);
  }

  const passport: DashboardPassport = {
    status: (user?.verificationStatus as DashboardPassport["status"]) || "unverified",
    isVerified: Boolean(user?.isVerified),
    nationality: user?.passport?.nationality ?? null,
    expiry: user?.passport?.passportExpiry
      ? safeIso(user.passport.passportExpiry)
      : null,
  };

  const insights: DashboardInsight[] = [];
  if (!passport.isVerified) {
    insights.push({
      id: "verify",
      title: "Unlock booking",
      body: "Verify your passport to reserve seats and journeys without friction.",
      href: "/dashboard/profile",
      tone: "navy",
    });
  }
  if (wishlist.length > 0) {
    insights.push({
      id: "wishlist",
      title: `Ready for ${wishlist[0]!.title}?`,
      body: "It’s on your wishlist — check packages while seasons are open.",
      href: wishlist[0]!.slug
        ? `/destinations/${wishlist[0]!.slug}`
        : "/destinations",
      tone: "teal",
    });
  }
  if (upcomingTrips[0] && (upcomingTrips[0].daysUntil ?? 99) <= 14) {
    insights.push({
      id: "pack",
      title: "Packing window open",
      body: `${upcomingTrips[0].title} is close — finish your checklist before departure.`,
      href: `/dashboard/trips/${upcomingTrips[0].id}`,
      tone: "sky",
    });
  }
  if (completedTrips > 0 && journal.length < completedTrips) {
    insights.push({
      id: "journal",
      title: "Capture the chapter",
      body: "You have completed trips without journal notes — memories fade faster than boarding passes.",
      href: "/dashboard/trips",
      tone: "coral",
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: "explore",
      title: "Expand the atlas",
      body: "Browse destinations matched to your season and curiosity.",
      href: "/destinations",
      tone: "teal",
    });
  }

  const quote = QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length]!;

  const stats: DashboardStats = {
    upcomingTrips: upcomingTrips.filter((t) => t.status !== "ongoing").length,
    ongoingTrips: upcomingTrips.filter((t) => t.status === "ongoing").length,
    openBookings,
    visitedPlaces: visits.length,
    unreadAnnouncements: announcements.filter((a) => !a.isRead).length,
    countries: visitedCountries.length,
    cities: visitedCities.length,
    completedTrips,
    totalSpent,
    totalBudget,
    packingProgress,
    explorerLevel,
    adventureScore,
    travelStreak,
  };

  return {
    firstName,
    stats,
    heroTrip: upcomingTrips[0] ?? allTrips.find((t) => t.status === "completed") ?? null,
    upcomingTrips: upcomingTrips.slice(0, 8),
    timelineTrips: [...allTrips]
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
      .slice(0, 8),
    announcements: announcements.slice(0, 6),
    calendarEvents,
    journal,
    packing: packing.slice(0, 12),
    wishlist,
    recentBookings: recentBookings.slice(0, 6),
    expensesByCategory,
    passport,
    insights: insights.slice(0, 4),
    visitedCountries,
    quote,
  };
}
