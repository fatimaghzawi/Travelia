"use client";

import dynamic from "next/dynamic";
import type { VisitedMapPin } from "@/lib/trips/visited-places";

const VisitedPlacesUi = dynamic(
  () =>
    import("@/components/traveler/VisitedPlacesUi").then(
      (m) => m.VisitedPlacesUi
    ),
  {
    ssr: false,
    loading: () => (
      <div className="trips-list">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-[#e8eef0]" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-[#eef3f4]" />
        <div className="mt-6 h-[min(70vh,560px)] animate-pulse rounded-2xl bg-[#eef3f4]" />
      </div>
    ),
  }
);

export function VisitedPlacesClient({ pins }: { pins: VisitedMapPin[] }) {
  return <VisitedPlacesUi pins={pins} />;
}
