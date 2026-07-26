import type { Metadata } from "next";
import { auth } from "@/auth";
import { DestinationsCatalog } from "@/components/destinations/DestinationsCatalog";
import {
  listActiveCategories,
  listActiveMoods,
  listPublishedDestinations,
} from "@/lib/destinations/queries";

export const metadata: Metadata = {
  title: "Destinations · Travelia",
  description: "Explore breathtaking places around the world.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const sp = await searchParams;

  const page = Math.max(1, Number(first(sp.page) || "1") || 1);
  const q = (first(sp.q) || "").trim();
  const categoryId = first(sp.category) || "all";
  const moodsRaw = first(sp.moods) || "";
  const moodIds = moodsRaw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const sortRaw = first(sp.sort) || "popular";
  const sort =
    sortRaw === "newest" ||
    sortRaw === "budget-asc" ||
    sortRaw === "budget-desc" ||
    sortRaw === "duration"
      ? sortRaw
      : "popular";

  const [{ items, meta }, categories, moods] = await Promise.all([
    listPublishedDestinations({
      userId,
      page,
      limit: 12,
      search: q || undefined,
      categoryId: categoryId !== "all" ? categoryId : undefined,
      moodIds: moodIds.length ? moodIds : undefined,
      sort,
    }),
    listActiveCategories(),
    listActiveMoods(),
  ]);

  return (
    <DestinationsCatalog
      destinations={items}
      meta={meta}
      categories={categories}
      moods={moods}
      isAuthenticated={isAuthenticated}
      initialQuery={q}
      initialCategoryId={categoryId}
      initialMoodIds={moodIds}
      initialSort={sort}
    />
  );
}
