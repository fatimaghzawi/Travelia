import { connectDB } from "@/lib/db/mongoose";
import {
  User,
  Destination,
  Booking,
  Payment,
  Trip,
  TripPackage,
  Notification,
} from "@/models";
import { ROLES } from "@/lib/constants/roles";
import {
  periodRange,
  type StatsPeriod,
} from "@/lib/admin/stats-period";

/** Aggregates every metric shown on the admin dashboard in one round trip. */
export async function getAdminStats(
  adminId: string,
  period: StatsPeriod = "week"
) {
  await connectDB();

  const { from, bucketFormat } = periodRange(period);

  const [
    totalUsers,
    verificationFunnel,
    topDestinations,
    liveTrips,
    revenueByCurrency,
    bookingsInPeriod,
    moodBreakdown,
    bookingsPerBucket,
    adminUnreadNotifications,
    packageOccupancy,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.TRAVELER }),

    User.aggregate([
      { $match: { role: ROLES.TRAVELER } },
      { $group: { _id: "$verificationStatus", count: { $sum: 1 } } },
    ]),

    Destination.find({ isPublished: true })
      .sort("-bookedCount")
      .limit(5)
      .select("title city country capacity bookedCount latitude longitude"),

    // Traveler itineraries currently in progress (not package departures)
    Trip.countDocuments({ status: "ongoing" }),

    Payment.aggregate([
      { $match: { status: "completed", createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $ifNull: ["$currency", "USD"] },
          total: { $sum: "$amount" },
        },
      },
    ]),

    Booking.countDocuments({ createdAt: { $gte: from } }),

    // Share of published destinations tagged with each mood (catalog mix)
    Destination.aggregate([
      { $match: { isPublished: true } },
      { $unwind: { path: "$moodIds", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$moodIds",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 4 },
      {
        $lookup: {
          from: "moods",
          localField: "_id",
          foreignField: "_id",
          as: "mood",
        },
      },
      { $unwind: "$mood" },
      { $project: { name: "$mood.name", count: 1 } },
    ]),

    Booking.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: {
            $dateToString: { format: bucketFormat, date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Notification.countDocuments({ userId: adminId, isRead: false }),

    TripPackage.aggregate([
      { $match: { isPublished: true, status: { $ne: "closed" } } },
      {
        $group: {
          _id: "$destinationId",
          capacity: { $sum: "$capacity" },
          bookedCount: { $sum: "$bookedCount" },
        },
      },
    ]),
  ]);

  const funnel = { unverified: 0, pending: 0, verified: 0, rejected: 0 } as Record<
    string,
    number
  >;
  for (const row of verificationFunnel) {
    funnel[row._id as string] = row.count;
  }

  const moodTotal = moodBreakdown.reduce(
    (sum: number, m: { count: number }) => sum + m.count,
    0
  );

  const packageByDest = new Map(
    packageOccupancy.map((row: {
      _id: unknown;
      capacity: number;
      bookedCount: number;
    }) => [String(row._id), row])
  );

  const revenueUsd =
    revenueByCurrency.find(
      (r: { _id: string; total: number }) =>
        String(r._id).toUpperCase() === "USD"
    )?.total ??
    revenueByCurrency.reduce(
      (sum: number, r: { total: number }) => sum + (r.total || 0),
      0
    );

  return {
    period,
    totals: {
      users: totalUsers,
      liveTrips,
      revenue: revenueUsd,
      revenueByCurrency: revenueByCurrency.map(
        (r: { _id: string; total: number }) => ({
          currency: String(r._id || "USD").toUpperCase(),
          total: r.total,
        })
      ),
      bookingsThisWeek: bookingsInPeriod,
      bookingsInPeriod,
    },
    unreadNotifications: adminUnreadNotifications,
    verificationFunnel: funnel,
    topDestinations: topDestinations.map((d) => {
      const pkg = packageByDest.get(String(d._id));
      const capacity = pkg?.capacity ?? d.capacity ?? 0;
      const bookedCount = pkg?.bookedCount ?? d.bookedCount ?? 0;
      return {
        id: d.id,
        title: d.title,
        city: d.city,
        country: d.country,
        capacity,
        bookedCount,
        occupancy:
          capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
      };
    }),
    moodBreakdown: moodBreakdown.map((m: { name: string; count: number }) => ({
      name: m.name,
      percent: moodTotal > 0 ? Math.round((m.count / moodTotal) * 100) : 0,
    })),
    bookingsTimeline: bookingsPerBucket,
  };
}
