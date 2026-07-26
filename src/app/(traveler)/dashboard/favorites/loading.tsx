import { TravelPlaneLoader } from "@/components/traveler/motion/TravelMotion";

export default function Loading() {
  return (
    <div className="trips-list">
      <TravelPlaneLoader label="Gathering your favorites…" />
    </div>
  );
}
