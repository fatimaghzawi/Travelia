import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePageUi } from "@/components/traveler/profile/ProfilePageUi";
import { connectDB } from "@/lib/db/mongoose";
import { requireTraveler } from "@/lib/auth/session";
import { serializeProfile } from "@/lib/profile/serialize";
import { User } from "@/models";

export const metadata: Metadata = {
  title: "Profile · Travelia",
  description: "Manage your Travelia profile and travel documents.",
};

export default async function ProfilePage() {
  let session;
  try {
    session = await requireTraveler();
  } catch {
    redirect("/login?callbackUrl=/dashboard/profile");
  }

  await connectDB();
  const user = await User.findById(session.id).select("+password");
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/profile");
  }

  return <ProfilePageUi initialProfile={serializeProfile(user)} />;
}
