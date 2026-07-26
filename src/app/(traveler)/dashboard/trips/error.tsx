"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function TripsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[trips] page error", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-red-200 bg-white px-6 py-10 text-center">
      <h1 className="text-lg font-semibold text-[#012A3E]">
        Couldn’t load My trips
      </h1>
      <p className="mt-2 text-sm text-[#67717A]">
        {error.message || "Something went wrong while loading your trips."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/dashboard/bookings"
          className="rounded-xl border border-[#d1e8ea] px-4 py-2.5 text-sm font-semibold text-[#012A3E]"
        >
          Back to bookings
        </Link>
      </div>
    </div>
  );
}
