import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TripGalleryUi } from "@/components/traveler/TripGalleryUi";
import { loadTravelerGallery } from "@/lib/trips/gallery";

export const metadata: Metadata = {
  title: "Gallery · Travelia",
  description: "Photos collected from your trip journals.",
};

export default async function GalleryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/gallery");
  }

  const photos = await loadTravelerGallery(session.user.id);

  return <TripGalleryUi photos={photos} />;
}
