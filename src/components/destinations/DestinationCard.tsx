import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Star,
  Wallet,
} from "lucide-react";
import type { DestinationCardData } from "@/lib/destinations/queries";
import { TravelPrice } from "@/components/traveler/preferences/TravelPrice";
import { DestinationImage } from "./DestinationImage";
import { FavoriteButton } from "./FavoriteButton";

type DestinationCardProps = {
  destination: DestinationCardData;
  isAuthenticated: boolean;
};

export function DestinationCard({
  destination,
  isAuthenticated,
}: DestinationCardProps) {
  const image = destination.thumbnail || "/images/dest2.jpg";
  const rating = Number(destination.ratingAverage.toFixed(1));
  const href = `/destinations/${destination.id}`;

  return (
    <article className="travelia-dest-card group relative flex aspect-[3/4] min-h-[340px] flex-col overflow-hidden rounded-2xl bg-[#012A3E] shadow-[0_10px_30px_rgba(1,42,62,0.18)] sm:min-h-[380px]">
      <Link
        href={href}
        className="absolute inset-0"
        aria-label={`View ${destination.title}`}
      >
        <DestinationImage
          src={image}
          alt={destination.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="travelia-dest-image object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#012A3E] via-[#012A3E]/55 to-[#012A3E]/10"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/15"
        />
      </Link>

      <div className="relative z-10 flex items-start justify-between gap-2 p-3.5 sm:p-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#012A3E] shadow-sm">
          <Star
            className="h-3 w-3 fill-[#127E83] text-[#127E83]"
            strokeWidth={0}
          />
          {rating.toFixed(1)}
        </span>
        <FavoriteButton
          destinationId={destination.id}
          initialFavorited={destination.isFavorited}
          isAuthenticated={isAuthenticated}
          compact
        />
      </div>

      <div className="relative z-10 mt-auto flex flex-col p-3.5 pt-0 sm:p-4 sm:pt-0">
        <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-white/90 uppercase">
          <MapPin className="h-3 w-3 shrink-0 text-white" strokeWidth={2} />
          <span>{destination.country}</span>
        </p>

        <Link href={href} className="mt-1.5 block">
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem]">
            {destination.title}
          </h2>
        </Link>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/80 sm:text-[13px]">
          {destination.description}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex min-w-0 items-start gap-1.5">
              <CalendarDays
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/90"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {destination.recommendedDays} Days
                </p>
                <p className="text-[10px] text-white/65">Duration</p>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-1.5">
              <Wallet
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/90"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  <TravelPrice amount={destination.estimatedBudget} />
                </p>
                <p className="text-[10px] text-white/65">Est. Budget</p>
              </div>
            </div>
          </div>

          <Link
            href={href}
            aria-label={`Open ${destination.title}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#127E83] text-white shadow-md transition hover:bg-[#0f6b6f] group-hover:scale-105"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </article>
  );
}
