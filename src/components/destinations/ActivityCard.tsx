import type { ActivityCardData } from "@/lib/destinations/queries";
import { TravelPrice } from "@/components/traveler/preferences/TravelPrice";
import { BookButton } from "./BookButton";
import { DestinationImage } from "./DestinationImage";

type ActivityCardProps = {
  activity: ActivityCardData;
  destinationId: string;
  tripDays?: number;
  requiresTravelDocuments: boolean;
  isAuthenticated: boolean;
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function ActivityCard({
  activity,
  destinationId,
  tripDays,
  requiresTravelDocuments,
  isAuthenticated,
}: ActivityCardProps) {
  const image = activity.image || "/images/dest2.jpg";
  const soldOut = activity.remainingSlots <= 0;

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#e8eef0]">
      <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
        <div className="relative aspect-[16/10] bg-[#e8eef0] sm:aspect-auto sm:min-h-[140px]">
          <DestinationImage
            src={image}
            alt={activity.title}
            fill
            sizes="(max-width: 640px) 100vw, 160px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[#012A3E]">
                {activity.title}
              </h3>
              <span className="rounded-md bg-[#F4F6F8] px-2 py-0.5 text-xs capitalize text-[#67717A]">
                {activity.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#67717A]">
              {activity.description}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#67717A]">
            <span>{formatDuration(activity.duration)}</span>
            <span><TravelPrice amount={activity.price} /></span>
            {activity.location ? <span>{activity.location}</span> : null}
            <span>
              {soldOut ? "Fully booked" : `${activity.remainingSlots} left`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <BookButton
              destinationId={destinationId}
              activityId={activity.id}
              title={activity.title}
              price={activity.price}
              tripDays={tripDays}
              activityDurationMinutes={activity.duration}
              requiresTravelDocuments={requiresTravelDocuments}
              isAuthenticated={isAuthenticated}
              disabled={soldOut || !activity.isAvailable}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
