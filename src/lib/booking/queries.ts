import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Booking } from "@/models";
import { claimSeat, releaseSeat } from "@/lib/booking/seats";
import { ROLES } from "@/lib/constants/roles";
import type { UpdateBookingInput } from "@/validators/booking.validator";

export type PageParams = { page: number; limit: number };

export type BookingListFilter = {
  status?: string;
  paymentStatus?: string;
  userId?: string;
};

/** Admin sees all bookings (optionally by user); travelers see only their own. */
export async function listBookings(
  sessionUser: { id: string; role: string },
  filter: BookingListFilter & PageParams
) {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (sessionUser.role === ROLES.ADMIN) {
    if (filter.userId) query.userId = filter.userId;
  } else {
    query.userId = sessionUser.id;
  }
  if (filter.status) query.status = filter.status;
  if (filter.paymentStatus) query.paymentStatus = filter.paymentStatus;

  const findQuery = Booking.find(query)
    .populate("destinationId", "title slug city country thumbnail")
    .populate("activityId", "title price duration")
    .populate("tripPackageId", "departureDate returnDate price guideIncluded title")
    .sort("-createdAt")
    .skip((filter.page - 1) * filter.limit)
    .limit(filter.limit);

  if (sessionUser.role === ROLES.ADMIN) {
    findQuery.populate("userId", "firstName lastName email");
  }

  const [items, total] = await Promise.all([
    findQuery.lean(),
    Booking.countDocuments(query),
  ]);

  return { items, total };
}

/** Full booking detail for admin review. */
export async function getBookingForAdmin(bookingId: string) {
  await connectDB();
  const booking = await Booking.findById(bookingId)
    .populate("userId", "firstName lastName email passport isVerified")
    .populate("destinationId", "title city country thumbnail")
    .populate("activityId", "title")
    .populate("tripPackageId", "departureDate returnDate price");
  if (!booking) throw new AppError("Booking not found", 404, "NOT_FOUND");
  return booking;
}

/**
 * Admin edit — reconciles seat capacity when status transitions in/out of
 * an active state (pending/confirmed).
 */
export async function updateBookingAsAdmin(
  bookingId: string,
  input: UpdateBookingInput
) {
  await connectDB();
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404, "NOT_FOUND");

  const wasActive = ["pending", "confirmed"].includes(booking.status);
  const willBeActive = input.status
    ? ["pending", "confirmed"].includes(input.status)
    : wasActive;

  Object.assign(booking, input);
  await booking.save();

  if (wasActive && !willBeActive) {
    await releaseSeat(
      booking.destinationId.toString(),
      booking.activityId?.toString(),
      booking.tripPackageId?.toString()
    );
  } else if (!wasActive && willBeActive) {
    try {
      await claimSeat(
        booking.destinationId.toString(),
        booking.activityId?.toString(),
        booking.tripPackageId?.toString()
      );
    } catch {
      throw new AppError(
        "Cannot reactivate booking — package or activity is full",
        409,
        "FULL"
      );
    }
  }

  return booking;
}
