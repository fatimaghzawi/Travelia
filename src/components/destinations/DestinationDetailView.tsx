import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Crosshair,
  MapPin,
  Star,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import type { DestinationDetailData } from "@/lib/destinations/queries";
import { TravelPrice } from "@/components/traveler/preferences/TravelPrice";
import { DestinationGallery } from "./DestinationGallery";
import { DestinationImage } from "./DestinationImage";
import { DestinationJourneyBuilder } from "./DestinationJourneyBuilder";
import { DestinationReviews } from "./DestinationReviews";
import { FavoriteButton } from "./FavoriteButton";
import { TaxonomyIcon } from "./TaxonomyIcon";

type DestinationDetailViewProps = {
  destination: DestinationDetailData;
  isAuthenticated: boolean;
};

function headline(destination: DestinationDetailData) {
  const title = destination.title.trim();
  const country = destination.country.trim();
  if (!country) return title;
  if (title.toLowerCase().includes(country.toLowerCase())) return title;
  return `${title}, ${country}`;
}

function RatingStars({ value }: { value: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
            i < filled
              ? "fill-[#127E83] text-[#127E83]"
              : "fill-transparent text-white/45"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function DestinationDetailView({
  destination,
  isAuthenticated,
}: DestinationDetailViewProps) {
  const hero = destination.thumbnail || "/images/dest2.jpg";
  const openPackages = destination.tripPackages.filter(
    (p) => p.status === "open" && p.remainingSlots > 0
  );
  const soldOut =
    destination.tripPackages.length > 0 && openPackages.length === 0;
  const title = headline(destination);
  const blurb =
    destination.description.length > 160
      ? `${destination.description.slice(0, 157).trimEnd()}…`
      : destination.description;

  const categoryIcon = destination.categoryName
    ? {
        slug: destination.categorySlug || destination.categoryName,
        icon: destination.categoryIcon,
      }
    : null;

  const galleryImages = Array.from(
    new Set(
      [
        ...destination.gallery,
        destination.thumbnail,
        ...destination.activities.map((a) => a.image),
      ].filter(Boolean) as string[]
    )
  ).slice(0, 24);

  const placeName = destination.city || destination.title;

  return (
    <div className="-mx-3 -mt-5 sm:-mx-4 sm:-mt-8 lg:-mt-10">
      <section className="relative isolate min-h-[32rem] overflow-hidden bg-[#012A3E] sm:min-h-[36rem] lg:min-h-[38rem]">
        <DestinationImage
          src={hero}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="travelia-kenburns object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,42,62,0.96)_0%,rgba(1,42,62,0.82)_26%,rgba(1,42,62,0.48)_50%,rgba(1,42,62,0.14)_70%,transparent_84%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#012A3E]/45 to-transparent"
        />

        {galleryImages.length > 0 ? (
          <DestinationGallery
            images={galleryImages}
            title={title}
            placement="hero"
          />
        ) : null}

        <div
          className={`relative z-10 mx-auto flex h-full min-h-[32rem] w-full max-w-7xl flex-col justify-end px-4 pt-20 sm:min-h-[36rem] sm:px-6 sm:pt-24 lg:min-h-[38rem] lg:px-8 ${galleryImages.length > 0 ? "pb-20 sm:pb-12 lg:pb-14" : "pb-8 sm:pb-12 lg:pb-14"}`}
        >
          <Link
            href="/destinations"
            className="mb-auto inline-flex w-fit items-center gap-1.5 text-sm font-medium text-white/90 transition hover:text-white [text-shadow:0_1px_8px_rgba(1,42,62,0.65)]"
          >
            ← All destinations
          </Link>

          <div className="max-w-3xl">
            <h1 className="font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-[3.25rem]">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.4)] sm:mt-4 sm:text-base">
              {blurb}
            </p>

            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.4)] sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
              <MetaItem icon={MapPin} label={destination.country} />
              <MetaItem icon={Crosshair} label={destination.city} />
              <MetaItem
                icon={CalendarDays}
                label={`${destination.recommendedDays} Days`}
              />
              <MetaItem
                icon={Wallet}
                label={<TravelPrice amount={destination.estimatedBudget} />}
              />
              {destination.bestSeason ? (
                <MetaItem icon={Sun} label={destination.bestSeason} />
              ) : null}
              <li className="col-span-2 inline-flex items-center gap-1.5 font-medium text-[#9aebed] sm:col-span-1">
                <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>
                  {destination.tripPackages.length === 0
                    ? "Trips coming soon"
                    : soldOut
                      ? "Fully booked"
                      : `${openPackages.reduce((n, p) => n + p.remainingSlots, 0)} spots left`}
                </span>
              </li>
            </ul>

            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <div className="inline-flex flex-wrap items-center gap-2 text-sm text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.4)]">
                <RatingStars value={destination.ratingAverage} />
                <span className="font-semibold">
                  {destination.ratingAverage.toFixed(1)}
                </span>
                <span className="text-white/90">
                  ({destination.reviewCount.toLocaleString()} reviews)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {destination.categoryName && categoryIcon ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#127E83]/80 bg-[#127E83]/55 px-3 py-1.5 text-xs font-medium text-white">
                    <TaxonomyIcon
                      slug={categoryIcon.slug}
                      icon={categoryIcon.icon}
                      className="h-3.5 w-3.5"
                    />
                    {destination.categoryName}
                  </span>
                ) : null}
                {destination.moods.map((mood) => (
                  <span
                    key={mood.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-transparent px-3 py-1.5 text-xs font-medium text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]"
                  >
                    <TaxonomyIcon
                      slug={mood.slug || mood.name}
                      icon={mood.icon}
                      className="h-3.5 w-3.5 text-[#9aebed]"
                    />
                    {mood.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col gap-2.5 sm:mt-7 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <a
                href="#build-journey"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#127E83] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f6d71] sm:w-auto"
              >
                Build your journey
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </a>
              <FavoriteButton
                destinationId={destination.id}
                initialFavorited={destination.isFavorited}
                isAuthenticated={isAuthenticated}
                variant="hero"
                label="Save favorite"
                savedLabel="Saved favorite"
                className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <DestinationJourneyBuilder
            destinationId={destination.id}
            destinationTitle={destination.title}
            placeName={placeName}
            requiresTravelDocuments={destination.requiresTravelDocuments}
            isAuthenticated={isAuthenticated}
            packages={destination.tripPackages}
            activities={destination.activities}
            recommendedDays={destination.recommendedDays}
          />
        </div>
      </section>

      <DestinationReviews
        reviews={destination.reviews}
        ratingAverage={destination.ratingAverage}
        reviewCount={destination.reviewCount}
      />
    </div>
  );
}

function MetaItem({
  icon: Icon,
  label,
}: {
  icon: typeof MapPin;
  label: ReactNode;
}) {
  return (
    <li className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0 text-white" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </li>
  );
}
