import path from "path";
import { connectDB } from "@/lib/db/mongoose";
import { Trip } from "@/models";
import { ROLES } from "@/lib/constants/roles";

/** Private on-disk storage (not under /public — not statically served). */
export function journalStorageDir(tripId: string) {
  return path.join(process.cwd(), "storage", "uploads", "journals", tripId);
}

export function journalMediaUrl(tripId: string, filename: string) {
  return `/api/media/journals/${tripId}/${encodeURIComponent(filename)}`;
}

export function parseJournalMediaUrl(url: string): {
  tripId: string;
  filename: string;
} | null {
  const apiMatch = url.match(
    /^\/api\/media\/journals\/([^/]+)\/([^/?#]+)/i
  );
  if (apiMatch) {
    return {
      tripId: apiMatch[1]!,
      filename: decodeURIComponent(apiMatch[2]!),
    };
  }

  // Legacy public paths written before private storage
  const legacy = url.match(/^\/uploads\/journals\/([^/]+)\/([^/?#]+)/i);
  if (legacy) {
    return {
      tripId: legacy[1]!,
      filename: decodeURIComponent(legacy[2]!),
    };
  }

  return null;
}

export type JournalMediaAccess =
  | { allowed: true }
  | { allowed: false; reason: "NOT_FOUND" | "FORBIDDEN" };

/** Checks trip ownership/admin access for serving a trip's journal media. */
export async function checkTripJournalMediaAccess(
  tripId: string,
  sessionUser: { id: string; role: string }
): Promise<JournalMediaAccess> {
  await connectDB();
  const trip = await Trip.findById(tripId).select("userId").lean();
  if (!trip) return { allowed: false, reason: "NOT_FOUND" };

  const isOwner = String(trip.userId) === sessionUser.id;
  const isAdmin = sessionUser.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) return { allowed: false, reason: "FORBIDDEN" };

  return { allowed: true };
}
