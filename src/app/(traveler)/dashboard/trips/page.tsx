import type { Metadata } from "next";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Expense, Review, Trip } from "@/models";
import { syncTravelerTrips } from "@/lib/trips/promote";
import {
  TripsListUi,
  type TripsListCard,
} from "@/components/traveler/TripsListUi";

export const metadata: Metadata = {
  title: "My trips · Travelia",
  description: "Manage ongoing trips, checklists, and budgets.",
};

type Dest = {
  _id?: unknown;
  title?: string;
  city?: string;
  country?: string;
  slug?: string;
  thumbnail?: string;
};

function safeIso(value: unknown) {
  const d = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function isDest(value: unknown): value is Dest {
  return Boolean(value) && typeof value === "object" && !("_bsontype" in (value as object));
}

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/trips");
  }

  let syncError: string | null = null;
  try {
    await syncTravelerTrips(session.user.id);
  } catch (error) {
    syncError =
      error instanceof Error ? error.message : "Could not sync trips";
    console.error("[trips] syncTravelerTrips failed", error);
  }

  await connectDB();
  const userId = new mongoose.Types.ObjectId(session.user.id);

  let trips: Array<Record<string, unknown> & {
    _id: unknown;
    title?: string;
    status: string;
    startDate: Date;
    endDate: Date;
    totalBudget?: number;
    coverImage?: string | null;
    destinationId?: unknown;
  }> = [];
  try {
    trips = (await Trip.find({
      userId,
      status: { $in: ["ongoing", "completed"] },
    })
      .populate("destinationId", "title slug city country thumbnail")
      .sort({ startDate: -1 })
      .lean()) as unknown as typeof trips;
  } catch (error) {
    console.error("[trips] Trip.find failed", error);
    syncError =
      syncError ||
      (error instanceof Error ? error.message : "Could not load trips");
  }

  const tripIds = trips.map((t) => t._id);
  let spentByTrip = new Map<string, number>();
  if (tripIds.length > 0) {
    try {
      const spentRows = await Expense.aggregate<{ _id: unknown; total: number }>([
        { $match: { tripId: { $in: tripIds }, userId } },
        { $group: { _id: "$tripId", total: { $sum: "$amount" } } },
      ]);
      spentByTrip = new Map(spentRows.map((r) => [String(r._id), r.total]));
    } catch (error) {
      console.error("[trips] expense aggregate failed", error);
    }
  }

  const destinationIds = trips
    .map((t) => {
      const destRaw = t.destinationId as unknown;
      if (isDest(destRaw) && destRaw._id) return String(destRaw._id);
      if (t.destinationId) return String(t.destinationId);
      return null;
    })
    .filter(Boolean) as string[];

  const reviews =
    destinationIds.length > 0
      ? await Review.find({
          userId,
          destinationId: {
            $in: destinationIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        })
          .select("_id destinationId rating comment isApproved createdAt")
          .lean()
      : [];

  const reviewByDestination = new Map(
    reviews.map((r) => [
      String(r.destinationId),
      {
        id: String(r._id),
        rating: r.rating,
        comment: r.comment ?? null,
        isApproved: r.isApproved,
        createdAt: new Date(r.createdAt).toISOString(),
      },
    ])
  );

  const cards: TripsListCard[] = trips.map((trip) => {
    const destRaw = trip.destinationId as unknown;
    const dest = isDest(destRaw) ? destRaw : null;
    const destinationId = dest?._id
      ? String(dest._id)
      : trip.destinationId
        ? String(trip.destinationId)
        : null;
    const spent = spentByTrip.get(String(trip._id)) ?? 0;
    return {
      id: String(trip._id),
      title: trip.title || "My trip",
      status: trip.status,
      startDate: safeIso(trip.startDate),
      endDate: safeIso(trip.endDate),
      totalBudget: Number(trip.totalBudget) || 0,
      spent,
      remaining: Math.max(0, (Number(trip.totalBudget) || 0) - spent),
      destination:
        dest && destinationId
          ? {
              id: destinationId,
              title: dest.title ?? "Destination",
              city: dest.city ?? null,
              country: dest.country ?? null,
              slug: dest.slug ?? null,
              thumbnail: dest.thumbnail ?? null,
            }
          : null,
      coverImage: trip.coverImage ?? null,
      existingReview: destinationId
        ? reviewByDestination.get(destinationId) ?? null
        : null,
    };
  });

  const ongoing = cards.filter((t) => t.status === "ongoing");
  const completed = cards.filter((t) => t.status === "completed");

  return (
    <TripsListUi
      ongoing={ongoing}
      completed={completed}
      syncError={syncError}
    />
  );
}
