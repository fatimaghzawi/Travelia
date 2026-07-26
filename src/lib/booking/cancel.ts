import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Booking, Payment, Trip } from "@/models";
import { releaseSeat } from "@/lib/booking/seats";
import type { IBooking } from "@/models/booking.model";
import { getStripe } from "@/lib/stripe";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Trip start = package departure date, else travel date. */
function tripStartDate(booking: {
  travelDate: Date;
  tripPackageId?: { departureDate?: Date; returnDate?: Date } | null;
}): Date {
  const pkg = booking.tripPackageId;
  if (pkg && typeof pkg === "object" && pkg.departureDate) {
    const start = new Date(pkg.departureDate);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  const travel = new Date(booking.travelDate);
  travel.setHours(0, 0, 0, 0);
  return travel;
}

/** Trip end = package return date, else travel date. */
function tripEndDate(booking: {
  travelDate: Date;
  tripPackageId?: { returnDate?: Date } | null;
}): Date {
  const pkg = booking.tripPackageId;
  if (pkg && typeof pkg === "object" && pkg.returnDate) {
    const end = new Date(pkg.returnDate);
    end.setHours(0, 0, 0, 0);
    return end;
  }
  const travel = new Date(booking.travelDate);
  travel.setHours(0, 0, 0, 0);
  return travel;
}

function packageObjectId(booking: IBooking): string | null {
  if (booking.tripPackageId == null) return null;
  if (
    typeof booking.tripPackageId === "object" &&
    "_id" in booking.tripPackageId
  ) {
    return String((booking.tripPackageId as { _id: unknown })._id);
  }
  return String(booking.tripPackageId);
}

async function cancelBookingRecord(booking: IBooking) {
  if (booking.status === "cancelled") return;

  const packageId = packageObjectId(booking);
  booking.status = "cancelled";
  await booking.save();

  await releaseSeat(
    booking.destinationId.toString(),
    booking.activityId?.toString() ?? null,
    packageId
  );

  if (booking.tripId) {
    await Trip.findOneAndUpdate(
      {
        _id: booking.tripId,
        userId: booking.userId,
        status: { $ne: "cancelled" },
      },
      { $set: { status: "cancelled" } }
    );
  }
}

/**
 * Activity bookings from the same destination journey as a trip package booking.
 */
async function findRelatedActivityBookings(booking: IBooking) {
  const byId = new Map<string, IBooking>();

  const payment = await Payment.findOne({
    userId: booking.userId,
    status: { $in: ["completed", "processing"] },
    $or: [{ bookingId: booking._id }, { bookingIds: booking._id }],
  }).sort("-createdAt");

  if (payment) {
    const ids = [
      ...new Set(
        [
          payment.bookingId,
          ...(payment.bookingIds?.length ? payment.bookingIds : []),
        ]
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ].filter((id) => id !== String(booking._id));

    if (ids.length > 0) {
      const siblings = await Booking.find({
        _id: { $in: ids },
        userId: booking.userId,
        activityId: { $ne: null },
        status: { $in: ["pending", "confirmed"] },
      });
      for (const sibling of siblings) {
        byId.set(String(sibling._id), sibling);
      }
    }
  }

  const dayStart = new Date(booking.travelDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const createdAt = booking.createdAt ? new Date(booking.createdAt) : new Date();
  const createdStart = new Date(createdAt.getTime() - 5 * 60 * 1000);
  const createdEnd = new Date(createdAt.getTime() + 5 * 60 * 1000);

  const fallback = await Booking.find({
    _id: { $ne: booking._id },
    userId: booking.userId,
    destinationId: booking.destinationId,
    activityId: { $ne: null },
    status: { $in: ["pending", "confirmed"] },
    travelDate: { $gte: dayStart, $lt: dayEnd },
    createdAt: { $gte: createdStart, $lte: createdEnd },
  });

  for (const sibling of fallback) {
    byId.set(String(sibling._id), sibling);
  }

  return [...byId.values()];
}

async function syncPaymentAfterCancel(
  userId: IBooking["userId"],
  cancelledBookingIds: string[]
) {
  if (cancelledBookingIds.length === 0) return;

  const objectIds = cancelledBookingIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const payment = await Payment.findOne({
    userId,
    status: { $in: ["completed", "processing", "pending"] },
    $or: [
      { bookingId: { $in: objectIds } },
      { bookingIds: { $in: objectIds } },
    ],
  }).sort("-createdAt");

  if (!payment) return;

  const linkedIds = [
    ...new Set(
      [
        payment.bookingId,
        ...(payment.bookingIds?.length ? payment.bookingIds : []),
      ]
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  const remaining = await Booking.find({
    _id: { $in: linkedIds },
    status: { $ne: "cancelled" },
  }).select("price");

  const nextAmount = remaining.reduce((sum, b) => {
    const price = typeof b.price === "number" ? b.price : Number(b.price) || 0;
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

  const previousAmount = Number(payment.amount) || 0;
  const refundDelta = Math.max(0, previousAmount - nextAmount);

  // Expire abandoned Stripe checkout sessions for unpaid holds
  if (
    payment.status !== "completed" &&
    payment.provider === "stripe" &&
    payment.transactionId
  ) {
    try {
      await getStripe().checkout.sessions.expire(payment.transactionId);
    } catch {
      // Session may already be expired/complete
    }
  }

  // Stripe refund for paid cancellations (full or partial)
  if (
    payment.status === "completed" &&
    payment.provider === "stripe" &&
    refundDelta > 0 &&
    payment.transactionId
  ) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(
        payment.transactionId
      );
      const intentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (intentId) {
        await stripe.refunds.create({
          payment_intent: intentId,
          amount: Math.round(refundDelta * 100),
        });
      }
    } catch {
      // Local cancel still proceeds; webhook may reconcile refund later
    }
  }

  payment.amount = Math.max(0, nextAmount);
  if (nextAmount <= 0) {
    if (payment.status === "completed") {
      payment.status = "refunded";
      payment.refundDate = payment.refundDate ?? new Date();
      payment.refundAmount = previousAmount;
    } else {
      payment.status = "failed";
      payment.failureReason = "Booking cancelled before payment";
    }
  }
  await payment.save();

  if (nextAmount <= 0 && payment.status === "refunded") {
    await Booking.updateMany(
      { _id: { $in: objectIds } },
      { $set: { paymentStatus: "refunded" } }
    );
  }
}

/**
 * Cancel a traveler's booking (and any linked journey activities), then
 * reconcile the linked payment (refund/expire as needed).
 */
export async function cancelBooking(bookingId: string, userId: string) {
  await connectDB();

  const booking = await Booking.findById(bookingId).populate(
    "tripPackageId",
    "returnDate departureDate"
  );
  if (!booking) throw new AppError("Booking not found", 404, "NOT_FOUND");
  if (String(booking.userId) !== userId) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }
  if (booking.status === "cancelled") {
    throw new AppError("Booking is already cancelled", 400, "ALREADY_CANCELLED");
  }
  if (booking.status === "completed") {
    throw new AppError(
      "Completed trips cannot be cancelled",
      400,
      "TRIP_COMPLETED"
    );
  }

  const isPaidConfirmed =
    booking.paymentStatus === "paid" && booking.status === "confirmed";
  const isUnpaidHold =
    booking.status === "pending" &&
    ["pending", "failed"].includes(booking.paymentStatus);

  if (!isPaidConfirmed && !isUnpaidHold) {
    throw new AppError(
      "This booking cannot be cancelled in its current state",
      400,
      "NOT_CANCELLABLE"
    );
  }

  const bookingWindow = booking as unknown as {
    travelDate: Date;
    tripPackageId?: { departureDate?: Date; returnDate?: Date } | null;
  };
  const start = tripStartDate(bookingWindow);
  const end = tripEndDate(bookingWindow);
  const today = startOfToday().getTime();

  if (start.getTime() <= today) {
    throw new AppError(
      "Travel has started — this booking can no longer be cancelled",
      400,
      "TRIP_STARTED"
    );
  }
  if (end.getTime() < today) {
    throw new AppError(
      "This trip has already ended and cannot be cancelled",
      400,
      "TRIP_ENDED"
    );
  }

  // Linked My Trips card ongoing/completed → no cancel (package or activity)
  if (booking.tripId) {
    const trip = await Trip.findById(booking.tripId).select("status").lean();
    if (trip && (trip.status === "ongoing" || trip.status === "completed")) {
      throw new AppError(
        "This booking is part of an active or completed trip and cannot be cancelled",
        400,
        "TRIP_IN_PROGRESS"
      );
    }
  }

  // Activity on a destination journey: block if the package trip already started
  if (booking.activityId && booking.destinationId) {
    const payment = await Payment.findOne({
      userId: booking.userId,
      status: { $in: ["completed", "processing"] },
      $or: [{ bookingId: booking._id }, { bookingIds: booking._id }],
    })
      .select("bookingId bookingIds")
      .sort("-createdAt")
      .lean();

    const linkedIds = [
      ...new Set(
        [
          payment?.bookingId,
          ...(payment?.bookingIds?.length ? payment.bookingIds : []),
        ]
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    const packageBookings = await Booking.find({
      userId: booking.userId,
      destinationId: booking.destinationId,
      tripPackageId: { $ne: null },
      status: { $in: ["confirmed", "completed"] },
      ...(linkedIds.length
        ? { _id: { $in: linkedIds } }
        : {}),
    })
      .populate("tripPackageId", "departureDate returnDate")
      .lean();

    // If no payment-linked packages, still check same-destination packages with tripId match
    const packagesToCheck =
      packageBookings.length > 0
        ? packageBookings
        : await Booking.find({
            userId: booking.userId,
            destinationId: booking.destinationId,
            tripPackageId: { $ne: null },
            status: { $in: ["confirmed", "completed"] },
            ...(booking.tripId ? { tripId: booking.tripId } : {}),
          })
            .populate("tripPackageId", "departureDate returnDate")
            .lean();

    for (const pkgBooking of packagesToCheck) {
      const pkg = pkgBooking.tripPackageId as unknown as {
        departureDate?: Date;
        returnDate?: Date;
      } | null;
      const pkgStart = tripStartDate({
        travelDate: pkgBooking.travelDate,
        tripPackageId: pkg,
      });
      const pkgEnd = tripEndDate({
        travelDate: pkgBooking.travelDate,
        tripPackageId: pkg,
      });
      if (pkgStart.getTime() <= today || pkgEnd.getTime() < today) {
        throw new AppError(
          "The destination trip has started or finished — activities can no longer be cancelled",
          400,
          "JOURNEY_LOCKED"
        );
      }
      if (pkgBooking.status === "completed") {
        throw new AppError(
          "Completed destination trips cannot cancel activities",
          400,
          "TRIP_COMPLETED"
        );
      }
    }

    // Also lock when any trip for this destination is ongoing/completed
    const liveTrip = await Trip.findOne({
      userId: booking.userId,
      destinationId: booking.destinationId,
      status: { $in: ["ongoing", "completed"] },
    })
      .select("_id")
      .lean();
    if (liveTrip) {
      throw new AppError(
        "This activity belongs to an ongoing or completed trip and cannot be cancelled",
        400,
        "TRIP_IN_PROGRESS"
      );
    }
  }

  const packageId = packageObjectId(booking);
  const cancelledIds = [String(booking._id)];

  await cancelBookingRecord(booking);

  // Cancelling the destination trip also cancels linked journey activities.
  let cancelledActivities = 0;
  if (packageId) {
    const related = await findRelatedActivityBookings(booking);
    for (const sibling of related) {
      await cancelBookingRecord(sibling);
      cancelledIds.push(String(sibling._id));
      cancelledActivities += 1;
    }
  }

  await syncPaymentAfterCancel(booking.userId, cancelledIds);

  return { booking, cancelledIds, cancelledActivities };
}
