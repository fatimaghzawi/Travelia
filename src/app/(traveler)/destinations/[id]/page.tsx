import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DestinationDetailView } from "@/components/destinations/DestinationDetailView";
import { getDestinationDetail } from "@/lib/destinations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const destination = await getDestinationDetail(id);
  if (!destination) {
    return { title: "Destination · Travelia" };
  }
  return {
    title: `${destination.title} · Travelia`,
    description: destination.description.slice(0, 160),
  };
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const destination = await getDestinationDetail(id, userId);

  if (!destination) notFound();

  return (
    <DestinationDetailView
      destination={destination}
      isAuthenticated={isAuthenticated}
    />
  );
}
