"use client";

import { Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export type PublicReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
};

type DestinationReviewsProps = {
  reviews: PublicReviewItem[];
  ratingAverage: number;
  reviewCount: number;
};

function Stars({ value }: { value: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < filled
              ? "fill-[#C48A1A] text-[#C48A1A]"
              : "fill-transparent text-[#d1dce0]"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function DestinationReviews({
  reviews,
  ratingAverage,
  reviewCount,
}: DestinationReviewsProps) {
  const reduce = useReducedMotion();

  return (
    <section className="border-t border-[#e8eef0] bg-[#F4FAFB]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#127E83] uppercase">
              Traveler voices
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#012A3E] sm:text-3xl">
              Reviews
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#012A3E]">
            <Stars value={ratingAverage} />
            <span className="font-semibold">{ratingAverage.toFixed(1)}</span>
            <span className="text-[#67717A]">
              · {reviewCount.toLocaleString()} review
              {reviewCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="mt-6 text-sm text-[#67717A]">
            No traveler reviews yet. Complete a trip here to leave the first
            one.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <motion.li
                key={review.id}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-2xl border border-[#e8eef0] bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#012A3E]">
                    {review.userName}
                  </p>
                  <Stars value={review.rating} />
                </div>
                {review.comment ? (
                  <p className="mt-3 text-sm leading-relaxed text-[#012A3E]/80">
                    {review.comment}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[#94A3B8]">Rated this trip.</p>
                )}
                <p className="mt-3 text-xs text-[#94A3B8]">
                  {new Date(review.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
