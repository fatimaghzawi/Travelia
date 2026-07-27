import Image from "next/image";
import Link from "next/link";
import { StarIcon } from "./icons";
import { connectDB } from "@/lib/db/mongoose";
import { Destination } from "@/models";

type FeaturedDestination = {
  _id: string;
  title: string;
  city: string;
  country: string;
  thumbnail: string | null;
  ratingAverage: number;
  reviewCount: number;
  estimatedBudget: number;
};

function budgetSymbol(amount: number) {
  if (amount < 800) return "$";
  if (amount < 2000) return "$$";
  return "$$$";
}

async function getFeaturedDestinations(): Promise<FeaturedDestination[]> {
  await connectDB();

  const destinations = await Destination.find({ isPublished: true })
    .sort({ ratingAverage: -1 })
    .limit(3)
    .select("title city country thumbnail ratingAverage reviewCount estimatedBudget")
    .lean();

  return JSON.parse(JSON.stringify(destinations));
}

export async function FeaturedDestinations() {
  const destinations = await getFeaturedDestinations();

  return (
    <section id="destinations" className="lp-section lp-section--white">
      <div className="lp-wrap">
        <div className="lp-row-head">
          <h2 className="lp-title">Featured destinations</h2>
          <Link href="/destinations" className="lp-link">
            View all
          </Link>
        </div>

        {destinations.length === 0 ? (
          <p className="lp-empty">No destinations published yet — check back soon.</p>
        ) : (
          <ul className="lp-cards">
            {destinations.map((destination) => (
              <li key={destination._id}>
                <Link href={`/destinations/${destination._id}`} className="lp-card">
                  <div className="lp-card__media">
                    <Image
                      src={destination.thumbnail || "/images/dest2.jpg"}
                      alt={destination.title}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 980px) 50vw, 360px"
                    />
                  </div>
                  <div className="lp-card__body">
                    <h3>
                      {destination.city}, {destination.country}
                    </h3>
                    <div className="lp-card__meta">
                      <span className="lp-card__rating">
                        <StarIcon
                          className="lp-card__star"
                          width={14}
                          height={14}
                          style={{ display: "inline-block", verticalAlign: "-2px" }}
                        />
                        {Number(destination.ratingAverage || 0).toFixed(1)} (
                        {Number(destination.reviewCount || 0).toLocaleString()})
                      </span>
                      <span className="lp-card__budget">
                        Budget: {budgetSymbol(destination.estimatedBudget || 0)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
