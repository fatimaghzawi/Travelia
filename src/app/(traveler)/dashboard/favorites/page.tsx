import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FavoritesPageUi } from "@/components/traveler/FavoritesPageUi";
import { listFavoriteDestinations } from "@/lib/destinations/queries";

export const metadata: Metadata = {
  title: "Favorites · Travelia",
  description: "Your saved destinations on Travelia.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/favorites");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(first(sp.page) || "1") || 1);
  const q = (first(sp.q) || "").trim();
  const { items: favorites, meta } = await listFavoriteDestinations({
    userId: session.user.id,
    page,
    limit: 12,
    search: q || undefined,
  });

  return (
    <FavoritesPageUi
      favorites={favorites}
      meta={meta}
      initialQuery={q}
    />
  );
}
