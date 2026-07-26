import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VisitedPlacesClient } from "@/components/traveler/VisitedPlacesClient";
import { loadVisitedMapPins } from "@/lib/trips/visited-places";

export const metadata: Metadata = {
  title: "Visited places · Travelia",
  description: "Interactive map of every place you have visited.",
};

export default async function VisitedPlacesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/visited");
  }

  const pins = await loadVisitedMapPins(session.user.id);

  return <VisitedPlacesClient pins={pins} />;
}
