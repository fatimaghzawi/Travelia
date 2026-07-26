"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type {
  DestinationCardData,
  TaxonomyItem,
} from "@/lib/destinations/queries";
import {
  ListPagination,
  type ListPaginationMeta,
} from "@/components/ui/ListPagination";
import { DestinationCard } from "./DestinationCard";
import { TaxonomyIcon } from "./TaxonomyIcon";

type SortKey = "popular" | "newest" | "budget-asc" | "budget-desc" | "duration";

type DestinationsCatalogProps = {
  destinations: DestinationCardData[];
  meta: ListPaginationMeta;
  categories: TaxonomyItem[];
  moods: TaxonomyItem[];
  isAuthenticated: boolean;
  initialQuery: string;
  initialCategoryId: string;
  initialMoodIds: string[];
  initialSort: SortKey;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "budget-asc", label: "Budget: Low to High" },
  { value: "budget-desc", label: "Budget: High to Low" },
  { value: "duration", label: "Duration" },
];

export function DestinationsCatalog({
  destinations,
  meta,
  categories,
  moods,
  isAuthenticated,
  initialQuery,
  initialCategoryId,
  initialMoodIds,
  initialSort,
}: DestinationsCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [selectedMoods, setSelectedMoods] = useState(initialMoodIds);
  const [sort, setSort] = useState<SortKey>(initialSort);

  useEffect(() => {
    setQuery(initialQuery);
    setCategoryId(initialCategoryId);
    setSelectedMoods(initialMoodIds);
    setSort(initialSort);
  }, [initialQuery, initialCategoryId, initialMoodIds, initialSort]);

  const pushFilters = useCallback(
    (next: {
      q?: string;
      category?: string;
      moods?: string[];
      sort?: SortKey;
      page?: number;
    }) => {
      const params = new URLSearchParams();
      const q = next.q ?? query;
      const category = next.category ?? categoryId;
      const moodList = next.moods ?? selectedMoods;
      const sortKey = next.sort ?? sort;
      const page = next.page ?? 1;

      if (q.trim()) params.set("q", q.trim());
      if (category && category !== "all") params.set("category", category);
      if (moodList.length) params.set("moods", moodList.join(","));
      if (sortKey !== "popular") params.set("sort", sortKey);
      if (page > 1) params.set("page", String(page));

      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [query, categoryId, selectedMoods, sort, pathname, router]
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query.trim() === initialQuery.trim()) return;
      pushFilters({ q: query, page: 1 });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [query, initialQuery, pushFilters]);

  function hrefForPage(page: number) {
    const params = new URLSearchParams();
    if (initialQuery.trim()) params.set("q", initialQuery.trim());
    if (initialCategoryId && initialCategoryId !== "all") {
      params.set("category", initialCategoryId);
    }
    if (initialMoodIds.length) params.set("moods", initialMoodIds.join(","));
    if (initialSort !== "popular") params.set("sort", initialSort);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function toggleMood(id: string) {
    const next = selectedMoods.includes(id)
      ? selectedMoods.filter((m) => m !== id)
      : [...selectedMoods, id];
    setSelectedMoods(next);
    pushFilters({ moods: next, page: 1 });
  }

  return (
    <div>
      <header className="relative overflow-hidden rounded-2xl border border-[#d1e8ea]/80 bg-white px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/dest7.jpg"
          alt=""
          aria-hidden
          className="travelia-kenburns pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"
        />

        <div className="relative max-w-xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#012A3E] sm:text-5xl">
            Destinations
          </h1>
          <p className="mt-2 text-sm text-[#67717A] sm:text-base">
            Explore breathtaking places around the world.
          </p>
        </div>

        <div className="relative mt-6 flex items-center gap-3 sm:mt-8">
          <label className="travelia-search relative w-full">
            <span className="sr-only">Search destinations</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67717A]"
              strokeWidth={2}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations, countries..."
              className="w-full rounded-full border border-[#d1e8ea] bg-white py-2.5 pl-11 pr-4 text-sm text-[#012A3E] shadow-[0_2px_12px_rgba(1,42,62,0.04)] outline-none transition placeholder:text-[#67717A]/70 focus:border-[#127E83]/50 focus:shadow-[0_8px_28px_rgba(18,126,131,0.15)] focus:ring-2 focus:ring-[#127E83]/15"
            />
          </label>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryChip
            label="All Destinations"
            active={categoryId === "all"}
            onClick={() => {
              setCategoryId("all");
              pushFilters({ category: "all", page: 1 });
            }}
            slug="all"
            icon="compass"
          />
          {categories.map((category) => {
            return (
              <CategoryChip
                key={category.id}
                label={category.name}
                active={categoryId === category.id}
                onClick={() => {
                  setCategoryId(category.id);
                  pushFilters({ category: category.id, page: 1 });
                }}
                slug={category.slug}
                icon={category.icon}
              />
            );
          })}
        </div>

        <label className="flex shrink-0 items-center gap-2 text-sm text-[#67717A]">
          <span>Sort by:</span>
          <select
            value={sort}
            onChange={(e) => {
              const next = e.target.value as SortKey;
              setSort(next);
              pushFilters({ sort: next, page: 1 });
            }}
            className="rounded-lg border border-[#d1e8ea] bg-white px-3 py-2 text-sm font-medium text-[#012A3E] outline-none focus:border-[#127E83]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {moods.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[#d1e8ea] bg-white px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#012A3E]">
              <Sparkles className="h-4 w-4 text-[#127E83]" strokeWidth={1.75} />
              Filter by mood
            </p>
            {selectedMoods.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedMoods([]);
                  pushFilters({ moods: [], page: 1 });
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#127E83] hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                Clear moods
              </button>
            ) : null}
          </div>
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
            {moods.map((mood) => {
              const active = selectedMoods.includes(mood.id);
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => toggleMood(mood.id)}
                  aria-pressed={active}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-[#127E83] bg-[#F4FAFB] text-[#127E83] shadow-sm"
                      : "border-[#d1e8ea] bg-white text-[#67717A] hover:border-[#127E83]/40 hover:text-[#012A3E]"
                  }`}
                >
                  <TaxonomyIcon
                    slug={mood.slug}
                    icon={mood.icon}
                    className="h-3.5 w-3.5"
                  />
                  {mood.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {destinations.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d1e8ea] bg-white px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold text-[#012A3E]">
            No destinations found
          </p>
          <p className="mt-2 text-sm text-[#67717A]">
            Try another search, category, or mood filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategoryId("all");
              setSelectedMoods([]);
              setSort("popular");
              startTransition(() => router.push(pathname));
            }}
            className="mt-5 inline-flex rounded-full bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6b6f]"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
          <ListPagination meta={meta} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  slug,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  slug: string;
  icon?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
        active
          ? "border-[#127E83] bg-[#F4FAFB] text-[#127E83] shadow-sm"
          : "border-[#d1e8ea] bg-white text-[#67717A] hover:border-[#127E83]/40 hover:text-[#012A3E]"
      }`}
    >
      <TaxonomyIcon slug={slug} icon={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}
