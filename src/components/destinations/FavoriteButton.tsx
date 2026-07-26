"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";

type FavoriteButtonProps = {
  destinationId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  className?: string;
  compact?: boolean;
  /** Outlined white control for dark hero backgrounds. */
  variant?: "default" | "hero";
  label?: string;
  savedLabel?: string;
};

export function FavoriteButton({
  destinationId,
  initialFavorited,
  isAuthenticated,
  className = "",
  compact = false,
  variant = "default",
  label = "Save",
  savedLabel = "Saved",
}: FavoriteButtonProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [bump, setBump] = useState(0);

  async function toggle() {
    setError(null);
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/destinations/${destinationId}`);
      return;
    }

    const previous = favorited;
    setFavorited(!previous);
    setBump((n) => n + 1);

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFavorited(previous);
        setError(json.message || "Could not update favorite");
        return;
      }
      setFavorited(Boolean(json.data?.favorited));
      startTransition(() => router.refresh());
    } catch {
      setFavorited(previous);
      setError("Could not update favorite");
    }
  }

  const buttonClass = compact
    ? `h-9 w-9 rounded-full border border-[#d1e8ea] bg-white shadow-sm ${
        favorited
          ? "text-[#127E83]"
          : "text-[#67717A] hover:text-[#127E83]"
      }`
    : variant === "hero"
      ? favorited
        ? "rounded-xl border border-white/80 bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm"
        : "rounded-xl border border-white/70 bg-transparent px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
      : favorited
        ? "rounded-xl border border-[#127E83]/30 bg-[#127E83]/10 px-3.5 py-2.5 text-sm font-medium text-[#127E83]"
        : "rounded-xl border border-[#d7e0e4] bg-white px-3.5 py-2.5 text-sm font-medium text-[#012A3E] hover:border-[#127E83]/40 hover:text-[#127E83]";

  return (
    <div className={className}>
      <motion.button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorited}
        aria-label={favorited ? "Remove from favorites" : "Save as favorite"}
        className={`inline-flex items-center justify-center gap-2 transition disabled:opacity-60 ${buttonClass}`}
        whileTap={reduce ? undefined : { scale: 0.9 }}
        whileHover={reduce ? undefined : { scale: 1.06 }}
      >
        <motion.span
          key={bump}
          initial={reduce ? false : { scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 14 }}
          className="inline-flex"
        >
          <HeartIcon filled={favorited} />
        </motion.span>
        {!compact ? (favorited ? savedLabel : label) : null}
      </motion.button>
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}
