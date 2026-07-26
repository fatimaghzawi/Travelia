"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Briefcase, Check, Plane } from "lucide-react";

/** Full-page / section airplane loading — dashed flight path + plane. */
export function TravelPlaneLoader({
  label = "Charting your course…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 py-16 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="relative h-28 w-full max-w-sm overflow-hidden">
        {/* Flight path */}
        <svg
          className="absolute inset-x-4 top-1/2 h-16 w-[calc(100%-2rem)] -translate-y-1/2 text-[#127E83]/35"
          viewBox="0 0 320 64"
          fill="none"
          aria-hidden
        >
          <path
            d="M8 48 C 80 8, 160 56, 240 20 S 300 40, 312 28"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 8"
            className={reduce ? "" : "travelia-flight-dash"}
          />
        </svg>

        <motion.div
          className="absolute top-1/2 left-0 text-[#012A3E]"
          style={{ y: "-50%" }}
          animate={
            reduce
              ? undefined
              : {
                  x: ["0%", "85%"],
                  y: ["-20%", "-70%", "-35%", "-55%", "-40%"],
                  rotate: [0, -8, 4, -6, 0],
                }
          }
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Plane className="h-9 w-9 -rotate-12" strokeWidth={1.75} />
        </motion.div>

        {/* Soft cloud blobs */}
        {!reduce ? (
          <>
            <motion.span
              aria-hidden
              className="absolute top-2 left-[18%] h-3 w-10 rounded-full bg-[#51A5D6]/25"
              animate={{ x: [0, 12, 0], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.span
              aria-hidden
              className="absolute right-[22%] bottom-3 h-2.5 w-8 rounded-full bg-[#34BDAF]/30"
              animate={{ x: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </>
        ) : null}
      </div>
      <p className="font-display text-lg font-semibold text-[#012A3E]">{label}</p>
      <p className="text-sm text-[#67717A]">Wheels up in a moment</p>
    </div>
  );
}

/** Compact skeleton shell with airplane hero for dashboard loading. */
export function DashboardTravelLoading() {
  return (
    <div className="trips-list space-y-8" aria-busy="true">
      <div className="relative min-h-[min(60vh,420px)] overflow-hidden rounded-[2rem] bg-[#002642]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 40%, rgba(81,165,214,0.35), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(52,189,175,0.25), transparent 50%)",
          }}
        />
        <TravelPlaneLoader
          label="Preparing your travel desk…"
          className="relative min-h-[min(60vh,420px)] py-0 text-white [&_p]:text-white/80 [&_.font-display]:text-white [&_svg]:text-[#9aebed]"
        />
      </div>
      <div className="flex justify-center gap-4 sm:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 w-14 animate-pulse rounded-full bg-[#d1e8ea]/70 sm:h-16 sm:w-16"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

type FlightOverlayProps = {
  open: boolean;
  phase: "packing" | "flying" | "done";
  title?: string;
};

/** Full-screen booking ritual: bag seals → plane takes off. */
export function BookingFlightOverlay({
  open,
  phase,
  title = "Locking your seat",
}: FlightOverlayProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[#002642]/88 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="assertive"
          aria-label={title}
        >
          <div className="relative w-full max-w-sm text-center">
            <AnimatePresence mode="wait">
              {phase === "packing" ? (
                <motion.div
                  key="pack"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    className="relative flex h-28 w-28 items-center justify-center rounded-[1.75rem] bg-white/10 ring-1 ring-white/20"
                    animate={
                      reduce
                        ? undefined
                        : { scale: [1, 1.04, 1], rotate: [0, -2, 2, 0] }
                    }
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <Briefcase className="h-14 w-14 text-[#9aebed]" strokeWidth={1.5} />
                    <motion.span
                      className="absolute inset-x-6 top-[42%] h-0.5 origin-left bg-[#34BDAF]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </motion.div>
                  <p className="mt-6 font-display text-2xl font-semibold text-white">
                    Packing your booking…
                  </p>
                  <p className="mt-2 text-sm text-white/65">
                    Sealing dates, details, and passport info
                  </p>
                </motion.div>
              ) : null}

              {phase === "flying" || phase === "done" ? (
                <motion.div
                  key="fly"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative h-32 w-full overflow-hidden">
                    <svg
                      className="absolute inset-x-0 top-1/2 h-20 w-full -translate-y-1/2 text-white/25"
                      viewBox="0 0 320 80"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M0 50 C 70 10, 140 70, 220 30 S 300 45, 320 25"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="5 7"
                        className={reduce ? "" : "travelia-flight-dash"}
                      />
                    </svg>
                    <motion.div
                      className="absolute top-1/2 text-white"
                      initial={{ x: "5%", y: "-30%", rotate: -12, opacity: 0 }}
                      animate={
                        reduce
                          ? { opacity: 1, x: "40%", y: "-50%" }
                          : {
                              opacity: 1,
                              x: ["5%", "75%"],
                              y: ["-30%", "-75%", "-45%"],
                              rotate: [-12, -18, -8],
                            }
                      }
                      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Plane className="h-12 w-12" strokeWidth={1.5} />
                    </motion.div>
                  </div>
                  <p className="mt-4 font-display text-2xl font-semibold text-white">
                    {phase === "done" ? "Wheels up" : "Taking off…"}
                  </p>
                  <p className="mt-2 text-sm text-white/65">
                    {phase === "done"
                      ? "Your seat is reserved — finishing checkout"
                      : title}
                  </p>
                  {phase === "done" ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 16 }}
                      className="mt-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#34BDAF] text-white"
                    >
                      <Check className="h-6 w-6" strokeWidth={2.5} />
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Soft floating icon — use for dashboard ambient vibes. */
export function FloatIcon({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`inline-flex ${className}`}
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={{
        duration: 3.2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.span>
  );
}

/** Suitcase that zips shut as packing % climbs — for dashboard checklist. */
export function PackingBagSeal({
  progress,
  className = "",
}: {
  progress: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const sealed = progress >= 100;
  const zip = Math.min(1, Math.max(0, progress / 100));

  return (
    <motion.div
      className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4FAFB] ring-1 ring-[#002642]/08 ${className}`}
      animate={
        reduce
          ? undefined
          : sealed
            ? { scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }
            : { y: [0, -3, 0] }
      }
      transition={
        sealed
          ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
          : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
      }
      aria-hidden
    >
      <Briefcase
        className={`h-7 w-7 ${sealed ? "text-[#34BDAF]" : "text-[#127E83]"}`}
        strokeWidth={1.75}
      />
      <motion.span
        className="absolute inset-x-3 top-[46%] h-0.5 origin-left rounded-full bg-[#34BDAF]"
        style={{ scaleX: zip }}
      />
      {sealed ? (
        <motion.span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#34BDAF] text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 14 }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </motion.span>
      ) : null}
    </motion.div>
  );
}
