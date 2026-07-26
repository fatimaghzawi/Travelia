import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongoose";
import { Review } from "@/models";

export const metadata: Metadata = {
  title: "Reviews · Travelia",
};

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/reviews");
  }

  await connectDB();
  const reviews = await Review.find({ userId: session.user.id })
    .populate("destinationId", "title city country thumbnail")
    .sort("-createdAt")
    .lean();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
          Your reviews
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#67717A] sm:text-base">
          Ratings you left for destinations after completed trips.
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d1e8ea] bg-white px-5 py-10 text-center">
          <Star className="mx-auto h-8 w-8 text-[#94A3B8]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[#012A3E]">
            No reviews yet
          </p>
          <p className="mt-1 text-sm text-[#67717A]">
            Finish a trip, then review the destination from the trip page.
          </p>
          <Link
            href="/dashboard/trips"
            className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
          >
            Go to trips
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => {
            const dest = review.destinationId as unknown as {
              _id?: unknown;
              title?: string;
              city?: string;
              country?: string;
              thumbnail?: string | null;
            } | null;
            const destId = dest?._id
              ? String(dest._id)
              : String(review.destinationId);
            const place = [dest?.city, dest?.country].filter(Boolean).join(", ");
            return (
              <li
                key={String(review._id)}
                className="flex gap-4 rounded-2xl border border-[#e8eef0] bg-white p-4"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F4FAFB]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest?.thumbnail || "/images/dest3.jpg"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/destinations/${destId}`}
                        className="font-semibold text-[#012A3E] hover:text-[#127E83]"
                      >
                        {dest?.title || "Destination"}
                      </Link>
                      {place ? (
                        <p className="text-xs text-[#67717A]">{place}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating
                              ? "fill-[#C48A1A] text-[#C48A1A]"
                              : "fill-transparent text-[#d1dce0]"
                          }`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment ? (
                    <p className="mt-2 line-clamp-3 text-sm text-[#012A3E]/80">
                      {review.comment}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
                    <span>
                      {new Date(review.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {!review.isApproved ? (
                      <span className="text-[#C48A1A]">Hidden by admin</span>
                    ) : null}
                    {review.tripId ? (
                      <Link
                        href={`/dashboard/trips/${String(review.tripId)}#trip-review`}
                        className="font-semibold text-[#127E83] hover:underline"
                      >
                        Edit on trip
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
