"use client";

import { TravelPlaneLoader } from "@/components/traveler/motion/TravelMotion";

export default function TripsLoading() {
  return (
    <div className="rounded-[1.5rem] border border-[#d1e8ea]/80 bg-white/70 px-4 py-6 backdrop-blur-sm">
      <TravelPlaneLoader label="Loading your trips…" />
    </div>
  );
}
