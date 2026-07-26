"use client";

import { Users } from "lucide-react";
import type { TripPackageCardData } from "@/lib/destinations/queries";
import { TravelPrice } from "@/components/traveler/preferences/TravelPrice";
import { BookButton } from "./BookButton";

type AvailableTripsProps = {
  destinationId: string;
  destinationTitle: string;
  packages: TripPackageCardData[];
  requiresTravelDocuments: boolean;
  isAuthenticated: boolean;
};

function formatParts(departureIso: string, returnIso: string) {
  const dep = new Date(departureIso);
  const ret = new Date(returnIso);
  return {
    month: dep.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(dep.getDate()),
    range: `${dep.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${ret.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`,
    left: dep.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    right: ret.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export function AvailableTrips({
  destinationId,
  destinationTitle,
  packages,
  requiresTravelDocuments,
  isAuthenticated,
}: AvailableTripsProps) {
  return (
    <section id="available-trips" className="scroll-mt-24">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight text-[#012A3E] sm:text-2xl">
          Available Trips
        </h2>
        <p className="text-xs text-[#67717A] sm:text-sm">
          {packages.length === 0
            ? "None yet"
            : `${packages.length} departure${packages.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d1e8ea] bg-[#F4FAFB] px-4 py-6 text-center text-sm text-[#67717A]">
          No upcoming trips — check back soon.
        </div>
      ) : (
        <ul className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
          {packages.map((pkg) => {
            const parts = formatParts(pkg.departureDate, pkg.returnDate);
            const soldOut = pkg.status === "full" || pkg.remainingSlots <= 0;

            return (
              <li
                key={pkg.id}
                className={`group relative flex w-[11.5rem] shrink-0 overflow-hidden rounded-xl ring-1 transition sm:w-[12.5rem] ${
                  soldOut
                    ? "bg-[#F4F6F8] ring-[#e8eef0] opacity-75"
                    : "bg-[#F4FAFB] ring-[#d1e8ea] hover:-translate-y-0.5 hover:ring-[#127E83]/40 hover:shadow-[0_8px_20px_rgba(1,42,62,0.08)]"
                }`}
              >
                {/* Date stub */}
                <div
                  className={`flex w-12 shrink-0 flex-col items-center justify-center py-3 ${
                    soldOut
                      ? "bg-[#e8eef0] text-[#94A3B8]"
                      : "bg-[#012A3E] text-white"
                  }`}
                >
                  <span className="text-[9px] font-semibold tracking-wider">
                    {parts.month}
                  </span>
                  <span className="font-display text-xl leading-none font-semibold">
                    {parts.day}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
                  <p className="truncate text-[11px] font-medium text-[#67717A]">
                    {pkg.title || parts.range}
                  </p>
                  <p className="truncate text-xs font-semibold text-[#012A3E]">
                    {parts.range}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-1 text-[11px]">
                    <span className="inline-flex items-center gap-0.5 text-[#67717A]">
                      <Users className="h-3 w-3" strokeWidth={1.75} />
                      {soldOut ? "Full" : pkg.remainingSlots}
                    </span>
                    <span className="font-semibold text-[#127E83]">
                      <TravelPrice amount={pkg.price} />
                    </span>
                  </div>
                  <BookButton
                    destinationId={destinationId}
                    tripPackageId={pkg.id}
                    title={pkg.title || destinationTitle}
                    price={pkg.price}
                    departureLabel={parts.left}
                    returnLabel={parts.right}
                    guideIncluded={pkg.guideIncluded}
                    requiresTravelDocuments={requiresTravelDocuments}
                    isAuthenticated={isAuthenticated}
                    disabled={soldOut}
                    label={soldOut ? "Full" : "Book"}
                    className="!mt-0.5 w-full !rounded-lg !px-2 !py-1.5 !text-[11px]"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
