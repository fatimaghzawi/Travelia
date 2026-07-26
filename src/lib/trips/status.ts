import type { TripStatus } from "@/models/trip.model";

export function startOfDay(value: Date = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function deriveTripStatus(
  startDate: Date,
  endDate: Date,
  today: Date = startOfDay()
): TripStatus {
  const start = startOfDay(startDate).getTime();
  const end = startOfDay(endDate).getTime();
  const now = startOfDay(today).getTime();

  // Complete on the end date (inclusive), not the day after
  if (now >= end) return "completed";
  if (now >= start) return "ongoing";
  return "upcoming";
}

export function bookingWindow(input: {
  travelDate: Date | string;
  departureDate?: Date | string | null;
  returnDate?: Date | string | null;
}): { start: Date; end: Date } {
  const toValidDay = (value: Date | string | null | undefined, fallback: Date) => {
    if (value == null || value === "") return fallback;
    const d = startOfDay(new Date(value));
    return Number.isNaN(d.getTime()) ? fallback : d;
  };

  const today = startOfDay();
  const start = toValidDay(input.departureDate ?? input.travelDate, today);
  const end = toValidDay(
    input.returnDate ?? input.departureDate ?? input.travelDate,
    start
  );
  if (end.getTime() < start.getTime()) {
    return { start, end: start };
  }
  return { start, end };
}

export const DEFAULT_CHECKLIST_ITEMS = [
  "Passport / ID",
  "Booking confirmation & tickets",
  "Local currency or travel card",
  "Phone charger & adapter",
  "Medications",
  "Travel insurance details",
] as const;
