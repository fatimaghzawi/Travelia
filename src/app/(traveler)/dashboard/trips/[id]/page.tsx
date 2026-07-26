import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Booking, Checklist, Expense, Review, Trip } from "@/models";
import { syncTravelerTrips } from "@/lib/trips/promote";
import { buildJournalDaysForTrip } from "@/lib/trips/trip-journal-store";
import { TripDetailUi } from "@/components/traveler/TripDetailUi";

export const metadata: Metadata = {
  title: "Trip · Travelia",
};

type Params = Promise<{ id: string }>;

export default async function TripDetailPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/trips");
  }

  const { id } = await params;
  await syncTravelerTrips(session.user.id);
  await connectDB();

  const tripDoc = await Trip.findOne({
    _id: id,
    userId: session.user.id,
  }).select("_id startDate endDate");

  if (!tripDoc) {
    redirect("/dashboard/trips");
  }

  const journalDays = await buildJournalDaysForTrip({
    tripId: tripDoc._id,
    userId: session.user.id,
    startDate: tripDoc.startDate,
    endDate: tripDoc.endDate,
  });

  const trip = await Trip.findById(tripDoc._id)
    .populate("destinationId", "title slug city country thumbnail")
    .select("-days")
    .lean();

  if (!trip) {
    redirect("/dashboard/trips");
  }

  const expenses = await Expense.find({
    tripId: trip._id,
    userId: session.user.id,
  })
    .sort("-date")
    .lean();

  const [checklists, bookings] = await Promise.all([
    Checklist.find({ tripId: trip._id, userId: session.user.id })
      .sort("createdAt")
      .lean(),
    Booking.find({ tripId: trip._id, userId: session.user.id })
      .populate("activityId", "title")
      .populate("tripPackageId", "title")
      .lean(),
  ]);

  const expenseRows = expenses.map((e) => ({
    id: String(e._id),
    title: e.title,
    category: e.category,
    amount: Number(e.amount) || 0,
    currency: e.currency || "USD",
    date: new Date(e.date).toISOString(),
    notes: e.notes ?? null,
  }));
  const spent = expenseRows.reduce((sum, e) => sum + e.amount, 0);
  const destination = trip.destinationId as unknown as {
    _id?: unknown;
    title?: string;
    city?: string;
    country?: string;
    slug?: string;
    thumbnail?: string;
  } | null;

  const destinationId = destination?._id
    ? String(destination._id)
    : trip.destinationId
      ? String(trip.destinationId)
      : null;

  const existingReviewDoc =
    destinationId && trip.status === "completed"
      ? await Review.findOne({
          userId: session.user.id,
          destinationId,
        })
          .select("_id rating comment isApproved createdAt")
          .lean()
      : null;

  return (
    <TripDetailUi
      trip={{
        id: String(trip._id),
        title: trip.title,
        status: trip.status,
        startDate: new Date(trip.startDate).toISOString(),
        endDate: new Date(trip.endDate).toISOString(),
        totalBudget: trip.totalBudget ?? 0,
        estimatedCost: trip.estimatedCost ?? 0,
        spent,
        remaining: Math.max(0, (trip.totalBudget ?? 0) - spent),
        coverImage: trip.coverImage ?? null,
        destination:
          destination && destinationId
            ? {
                id: destinationId,
                title: destination.title ?? "Destination",
                city: destination.city ?? null,
                country: destination.country ?? null,
                slug: destination.slug ?? null,
                thumbnail: destination.thumbnail ?? null,
              }
            : null,
      }}
      journalDays={journalDays}
      existingReview={
        existingReviewDoc
          ? {
              id: String(existingReviewDoc._id),
              rating: existingReviewDoc.rating,
              comment: existingReviewDoc.comment ?? null,
              isApproved: existingReviewDoc.isApproved,
              createdAt: new Date(existingReviewDoc.createdAt).toISOString(),
            }
          : null
      }
      checklists={checklists.map((c) => ({
        id: String(c._id),
        title: c.title,
        items: (c.items ?? []).map((item) => ({
          id: String((item as { _id?: unknown })._id ?? ""),
          text: item.text,
          completed: Boolean(item.completed),
        })),
      }))}
      expenses={expenseRows}
      bookings={bookings.map((b) => {
        const activity = b.activityId as unknown as { title?: string } | null;
        const pkg = b.tripPackageId as unknown as { title?: string } | null;
        return {
          id: String(b._id),
          label: pkg?.title || activity?.title || "Booking",
          price: typeof b.price === "number" ? b.price : 0,
        };
      })}
    />
  );
}
