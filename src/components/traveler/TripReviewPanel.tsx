"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

export type TripReviewData = {
  id: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
};

type TripReviewPanelProps = {
  tripId: string;
  destinationId: string;
  destinationTitle: string;
  destinationHref?: string | null;
  initialReview?: TripReviewData | null;
  /** Slimmer layout for modals / cards */
  compact?: boolean;
  onSaved?: (review: TripReviewData) => void;
};

export function TripReviewPanel({
  tripId,
  destinationId,
  destinationTitle,
  destinationHref,
  initialReview = null,
  compact = false,
  onSaved,
}: TripReviewPanelProps) {
  const [review, setReview] = useState<TripReviewData | null>(initialReview);
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [editing, setEditing] = useState(!initialReview);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Pick a star rating");
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (review) {
        const res = await fetch(`/api/reviews/${review.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            comment: comment.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not update review");
        }
        setReview({
          ...review,
          rating,
          comment: comment.trim() || null,
        });
        onSaved?.({
          ...review,
          rating,
          comment: comment.trim() || null,
        });
      } else {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            destinationId,
            rating,
            comment: comment.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not submit review");
        }
        const data = json.data as {
          id: string;
          rating: number;
          comment: string | null;
          isApproved: boolean;
          createdAt: string;
        };
        const saved: TripReviewData = {
          id: data.id,
          rating: data.rating,
          comment: data.comment,
          isApproved: data.isApproved,
          createdAt: data.createdAt,
        };
        setReview(saved);
        onSaved?.(saved);
      }
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={
        compact
          ? "px-3 py-4 sm:px-4"
          : "mt-8 border border-[#012A3E]/10 bg-white px-4 py-5 sm:px-6"
      }
    >
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#127E83] uppercase">
              Trip complete
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-[#012A3E]">
              Review {destinationTitle}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-[#67717A]">
              Share how the destination felt — your rating helps other travelers
              choose their next trip.
            </p>
          </div>
          {destinationHref ? (
            <Link
              href={destinationHref}
              className="text-xs font-semibold text-[#127E83] hover:underline"
            >
              View destination
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[#67717A]">
          Share how the destination felt — your rating helps other travelers.
        </p>
      )}

      {!editing && review ? (
        <div className="mt-5">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < review.rating
                    ? "fill-[#C48A1A] text-[#C48A1A]"
                    : "fill-transparent text-[#d1dce0]"
                }`}
                strokeWidth={1.5}
              />
            ))}
            <span className="ml-2 text-sm font-semibold text-[#012A3E]">
              {review.rating}/5
            </span>
          </div>
          {review.comment ? (
            <p className="mt-3 text-sm leading-relaxed text-[#012A3E]/85">
              {review.comment}
            </p>
          ) : (
            <p className="mt-3 text-sm text-[#94A3B8]">No written comment.</p>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 text-xs font-semibold text-[#127E83] hover:underline"
          >
            Edit review
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#012A3E] uppercase">
              Your rating
            </p>
            <div
              className="mt-2 flex items-center gap-1"
              onMouseLeave={() => setHover(0)}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const value = i + 1;
                const active = (hover || rating) >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    onMouseEnter={() => setHover(value)}
                    onClick={() => setRating(value)}
                    className="rounded p-0.5 transition hover:scale-105"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        active
                          ? "fill-[#C48A1A] text-[#C48A1A]"
                          : "fill-transparent text-[#c5d4d8]"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-[#012A3E] uppercase">
              Comment <span className="font-normal text-[#94A3B8]">(optional)</span>
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="What stood out — food, pace, views, people…"
              className="mt-2 w-full resize-y rounded-xl border border-[#d1e8ea] bg-[#F4FAFB] px-3 py-2.5 text-sm text-[#012A3E] outline-none focus:border-[#127E83]"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center rounded-xl bg-[#012A3E] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending
                ? "Saving…"
                : review
                  ? "Update review"
                  : "Submit review"}
            </button>
            {review ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setRating(review.rating);
                  setComment(review.comment ?? "");
                  setError(null);
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#67717A] hover:text-[#012A3E]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
