import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardOs } from "@/components/traveler/dashboard/DashboardOs";
import { loadTravelerDashboard } from "@/lib/trips/dashboard";

export const metadata: Metadata = {
  title: "Dashboard · Travelia",
  description: "Your Travelia travel operating system.",
};

export default async function TravelerDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const data = await loadTravelerDashboard(
    session.user.id,
    session.user.name
  );

  return <DashboardOs data={data} />;
}
