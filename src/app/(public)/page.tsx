import type { Metadata } from "next";
import { auth } from "@/auth";
import { Hero } from "./landing/Hero";
import { HowItWorks } from "./landing/HowItWorks";
import { FeaturedDestinations } from "./landing/FeaturedDestinations";
import { ExploreByMood } from "./landing/ExploreByMood";
import { WhyTravelia } from "./landing/WhyTravelia";
import { CTA } from "./landing/CTA";
import { Footer } from "./landing/Footer";
import "./landing/landing.css";

export const metadata: Metadata = {
  title: "Travelia — Plan trips. Book moments.",
  description:
    "Discover destinations, verify once, and book with confidence. Travelia helps you plan trips and create lasting memories.",
};

export const revalidate = 300;

export default async function HomePage() {
  const session = await auth();
  const isAuthenticated = Boolean(
    session?.user?.id &&
      session.user.status === "active" &&
      session.user.emailVerified
  );

  return (
    <div className="lp">
      <div className="lp-shell">
        <Hero isAuthenticated={isAuthenticated} />
        <HowItWorks />
        <FeaturedDestinations />
        <ExploreByMood />
        <WhyTravelia />
        <CTA isAuthenticated={isAuthenticated} />
        <Footer isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
