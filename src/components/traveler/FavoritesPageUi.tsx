"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import type { DestinationCardData } from "@/lib/destinations/queries";
import { DestinationCard } from "@/components/destinations/DestinationCard";
import {
  ListPagination,
  type ListPaginationMeta,
} from "@/components/ui/ListPagination";

type FavoritesPageUiProps = {
  favorites: DestinationCardData[];
  meta: ListPaginationMeta;
  initialQuery: string;
};

export function FavoritesPageUi({
  favorites,
  meta,
  initialQuery,
}: FavoritesPageUiProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const syncedQuery = useRef(false);

  useEffect(() => {
    if (!syncedQuery.current) {
      syncedQuery.current = true;
      return;
    }
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query.trim() === initialQuery.trim()) return;
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [query, initialQuery, pathname, router]);

  function hrefForPage(page: number) {
    const params = new URLSearchParams();
    if (initialQuery.trim()) params.set("q", initialQuery.trim());
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function clearSearch() {
    setQuery("");
    startTransition(() => router.push(pathname));
  }

  const hasQuery = Boolean(initialQuery.trim());

  return (
    <div>
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#012A3E] sm:text-3xl">
          Favorites
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#67717A] sm:text-base">
          Destinations you saved for later.
        </p>

        <label className="relative mt-5 block max-w-md">
          <span className="sr-only">Search favorites</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#67717A]"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved destinations…"
            className="w-full rounded-xl border border-[#d1e8ea] bg-white py-2.5 pl-10 pr-3 text-sm text-[#012A3E] outline-none transition placeholder:text-[#67717A]/70 focus:border-[#127E83]/50 focus:ring-2 focus:ring-[#127E83]/15"
          />
        </label>
        {hasQuery ? (
          <button
            type="button"
            onClick={clearSearch}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#127E83] hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </button>
        ) : null}
      </header>

      {favorites.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#d7e0e4] bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-[#012A3E]">
            {hasQuery ? "No favorites match your search" : "No favorites yet"}
          </p>
          <p className="mt-2 text-sm text-[#67717A]">
            {hasQuery
              ? "Try another city, country, or destination name."
              : "Browse destinations and tap the heart to save places you like."}
          </p>
          {hasQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
            >
              Clear search
            </button>
          ) : (
            <Link
              href="/destinations"
              className="mt-5 inline-flex rounded-xl bg-[#127E83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f6d71]"
            >
              Explore destinations
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                isAuthenticated
              />
            ))}
          </div>
          <ListPagination meta={meta} hrefForPage={hrefForPage} />
        </>
      )}
    </div>
  );
}
