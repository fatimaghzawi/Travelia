import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Trip } from "@/models";
import { syncTravelerTrips } from "@/lib/trips/promote";
import { buildJournalDaysForTrip } from "@/lib/trips/trip-journal-store";
import { TripBookDocument } from "@/components/traveler/TripBookDocument";

export const metadata: Metadata = {
  title: "Export trip book · Travelia",
};

type Params = Promise<{ id: string }>;
type Search = Promise<{ print?: string }>;

export default async function TripBookPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/trips");
  }

  const { id } = await params;
  const query = await searchParams;
  await syncTravelerTrips(session.user.id);
  await connectDB();

  const tripDoc = await Trip.findOne({
    _id: id,
    userId: session.user.id,
  })
    .populate("destinationId", "title city country thumbnail")
    .lean();

  if (!tripDoc) {
    redirect("/dashboard/trips");
  }

  const journalDays = await buildJournalDaysForTrip({
    tripId: tripDoc._id,
    userId: session.user.id,
    startDate: tripDoc.startDate,
    endDate: tripDoc.endDate,
  });

  const destination = tripDoc.destinationId as unknown as {
    title?: string;
    city?: string;
    country?: string;
    thumbnail?: string;
  } | null;

  return (
    <TripBookDocument
      autoPrint={query.print === "1"}
      tripId={String(tripDoc._id)}
      trip={{
        title: tripDoc.title,
        status: tripDoc.status,
        startDate: new Date(tripDoc.startDate).toISOString(),
        endDate: new Date(tripDoc.endDate).toISOString(),
        coverImage:
          tripDoc.coverImage || destination?.thumbnail || null,
        destination: destination
          ? {
              title: destination.title ?? "Destination",
              city: destination.city ?? null,
              country: destination.country ?? null,
            }
          : null,
      }}
      days={journalDays}
    />
  );
}
