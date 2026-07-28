import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import {
  Activity,
  Booking,
  Destination,
  Payment,
  TripPackage,
  User,
} from "@/models";
import { assertUserCanBook } from "@/lib/booking/eligibility";
import { tryClaimActivitySeat, tryClaimPackageSeat, releaseSeat } from "@/lib/booking/seats";
import { getStripe, toStripeAmount } from "@/lib/stripe";

export type CreateJourneyInput = {
  destinationId: string;
  tripPackageId?: string | null;
  activityIds: string[];
  usePassportDetails: boolean;
  notes?: string | null;
};

type LineItem = {
  bookingId: string;
  name: string;
  amount: number;
  currency: string;
};

async function healVerification(user: InstanceType<typeof User>) {
  if (user.verificationStatus === "verified" && !user.isVerified) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isVerified: true,
          ...(user.verifiedAt ? {} : { verifiedAt: new Date() }),
        },
      }
    );
    user.isVerified = true;
  }
}

function assertBookable(user: InstanceType<typeof User>) {
  try {
    assertUserCanBook(user);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Cannot book",
      403,
      "NOT_ELIGIBLE"
    );
  }
}

async function cancelCreatedBookings(bookingIds: string[]) {
  for (const id of bookingIds) {
    const b = await Booking.findById(id);
    if (!b || b.status === "cancelled") continue;
    if (b.paymentStatus === "paid") continue;
    b.status = "cancelled";
    b.paymentStatus = "failed";
    await b.save();
    await releaseSeat(
      b.destinationId.toString(),
      b.activityId?.toString(),
      b.tripPackageId?.toString()
    );
  }
}

/**
 * Create a multi-item journey (trip package + activities) and start a Stripe
 * checkout for the payable total. Free journeys are confirmed immediately.
 */
export async function createJourneyCheckout(
  sessionUser: { id: string; email?: string | null },
  input: CreateJourneyInput
) {
  await connectDB();

  const user = await User.findById(sessionUser.id);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  await healVerification(user);
  assertBookable(user);

  const destination = await Destination.findById(input.destinationId);
  if (!destination || !destination.isPublished) {
    throw new AppError("Destination not found", 404, "NOT_FOUND");
  }

  if (destination.requiresTravelDocuments && !input.usePassportDetails) {
    throw new AppError(
      "This destination requires using your verified passport details",
      400,
      "PASSPORT_REQUIRED"
    );
  }

  const travelerPassport =
    input.usePassportDetails && user.passport
      ? {
          fullName: user.passport.fullName,
          nationality: user.passport.nationality,
          passportNumber: user.passport.passportNumber,
          passportExpiry: user.passport.passportExpiry,
          passportImage: user.passport.passportImage,
        }
      : null;

  const uniqueActivityIds = [...new Set(input.activityIds.map(String))];

  if (!input.tripPackageId) {
    throw new AppError(
      "Select a trip package before booking experiences",
      400,
      "PACKAGE_REQUIRED"
    );
  }

  const lineItems: LineItem[] = [];
  const createdBookingIds: string[] = [];
  /** Shared travel day for the journey — package departure when present. */
  let journeyTravelDate = new Date();
  journeyTravelDate.setHours(0, 0, 0, 0);

  try {
    // --- Trip package seat (required before any activities) ---
    if (input.tripPackageId) {
      const tripPackage = await TripPackage.findById(input.tripPackageId);
      if (!tripPackage || !tripPackage.isPublished) {
        throw new AppError("Trip package not found", 404, "NOT_FOUND");
      }
      if (String(tripPackage.destinationId) !== String(destination._id)) {
        throw new AppError(
          "Trip package does not belong to this destination",
          400,
          "INVALID_PACKAGE"
        );
      }
      if (tripPackage.status === "closed") {
        throw new AppError("This trip is closed for booking", 409, "CLOSED");
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const departure = new Date(tripPackage.departureDate);
      departure.setHours(0, 0, 0, 0);
      if (Number.isNaN(departure.getTime())) {
        throw new AppError(
          "This trip has an invalid departure date",
          400,
          "INVALID_DATE"
        );
      }
      if (departure.getTime() < today.getTime()) {
        throw new AppError("This trip has already departed", 400, "DEPARTED");
      }

      journeyTravelDate = departure;

      const existingPkg = await Booking.findOne({
        userId: user._id,
        tripPackageId: tripPackage._id,
        status: { $in: ["pending", "confirmed"] },
      });
      if (existingPkg) {
        throw new AppError(
          "You already have a booking for this trip",
          409,
          "ALREADY_BOOKED"
        );
      }

      const claimed = await tryClaimPackageSeat(String(tripPackage._id));
      if (!claimed) {
        throw new AppError("This trip is fully booked", 409, "FULL");
      }
      await Destination.findByIdAndUpdate(destination._id, {
        $inc: { bookedCount: 1 },
      });

      const booking = await Booking.create({
        userId: user._id,
        destinationId: destination._id,
        tripPackageId: tripPackage._id,
        activityId: null,
        travelDate: departure,
        price: Number(tripPackage.price) || 0,
        currency: "USD",
        status: "pending",
        paymentStatus: Number(tripPackage.price) > 0 ? "pending" : "paid",
        usePassportDetails: input.usePassportDetails,
        travelerPassport,
        notes: input.notes ?? null,
      });

      if (Number(tripPackage.price) <= 0) {
        booking.status = "confirmed";
        await booking.save();
      }

      createdBookingIds.push(String(booking._id));
      lineItems.push({
        bookingId: String(booking._id),
        name: `${destination.title} · trip`,
        amount: Number(tripPackage.price) || 0,
        currency: "USD",
      });
    }

    // --- Activity seats (same travel date as the selected trip departure) ---
    for (const activityId of uniqueActivityIds) {
      const activity = await Activity.findById(activityId);
      if (!activity || !activity.isAvailable) {
        throw new AppError("Activity not found", 404, "NOT_FOUND");
      }
      if (String(activity.destinationId) !== String(destination._id)) {
        throw new AppError(
          "Activity does not belong to this destination",
          400,
          "INVALID_ACTIVITY"
        );
      }

      const existing = await Booking.findOne({
        userId: user._id,
        activityId: activity._id,
        travelDate: journeyTravelDate,
        status: { $in: ["pending", "confirmed"] },
      });
      if (existing) {
        throw new AppError(
          `You already booked "${activity.title}"`,
          409,
          "ALREADY_BOOKED"
        );
      }

      const claimedActivity = await tryClaimActivitySeat(String(activity._id));
      if (!claimedActivity) {
        throw new AppError(
          `"${activity.title}" is fully booked`,
          409,
          "FULL"
        );
      }

      const booking = await Booking.create({
        userId: user._id,
        destinationId: destination._id,
        tripPackageId: null,
        activityId: activity._id,
        travelDate: journeyTravelDate,
        price: Number(activity.price) || 0,
        currency: "USD",
        status: "pending",
        paymentStatus: Number(activity.price) > 0 ? "pending" : "paid",
        usePassportDetails: input.usePassportDetails,
        travelerPassport,
        notes: input.notes ?? null,
      });

      if (Number(activity.price) <= 0) {
        booking.status = "confirmed";
        await booking.save();
      }

      createdBookingIds.push(String(booking._id));
      lineItems.push({
        bookingId: String(booking._id),
        name: activity.title,
        amount: Number(activity.price) || 0,
        currency: "USD",
      });
    }
  } catch (error) {
    // Best-effort: cancel anything already created if a later item fails
    if (createdBookingIds.length > 0) {
      await cancelCreatedBookings(createdBookingIds);
    }
    throw error;
  }

  const payableItems = lineItems.filter((item) => item.amount > 0);
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const primaryBookingId = payableItems[0]?.bookingId ?? createdBookingIds[0]!;

  // Always create a Payment so the bookings page can show one journey ticket
  // (package + activities) instead of N separate reservations.
  if (payableItems.length === 0) {
    const payment = await Payment.create({
      userId: user._id,
      bookingId: primaryBookingId,
      bookingIds: createdBookingIds,
      amount: 0,
      currency: "USD",
      paymentMethod: "card",
      status: "completed",
      provider: "stripe",
      paidAt: new Date(),
    });

    return {
      free: true as const,
      destinationTitle: destination.title,
      primaryBookingId,
      total: 0,
      bookingIds: createdBookingIds,
      paymentId: String(payment._id),
    };
  }

  const payment = await Payment.create({
    userId: user._id,
    bookingId: primaryBookingId,
    bookingIds: createdBookingIds,
    amount: Number(total) || 0,
    currency: "USD",
    paymentMethod: "card",
    status: "processing",
    provider: "stripe",
  });

  const metadata = {
    paymentId: String(payment._id),
    userId: sessionUser.id,
    bookingId: primaryBookingId,
    bookingIds: createdBookingIds.join(","),
  };

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      redirect_on_completion: "never",
      client_reference_id: primaryBookingId,
      customer_email: sessionUser.email || undefined,
      line_items: payableItems.map((item) => ({
        quantity: 1,
        price_data: {
          currency: item.currency.toLowerCase(),
          unit_amount: toStripeAmount(item.amount),
          product_data: {
            name: item.name,
            description: `Travelia journey · ${destination.title}`,
          },
        },
      })),
      metadata,
      payment_intent_data: { metadata },
    });
  } catch (error) {
    payment.status = "failed";
    payment.failureReason =
      error instanceof Error ? error.message : "Stripe checkout failed";
    await payment.save();
    await cancelCreatedBookings(createdBookingIds);
    throw new AppError(
      "Could not start checkout. Your seats were released — please try again.",
      502,
      "STRIPE_ERROR"
    );
  }

  if (!session.client_secret) {
    throw new AppError("Failed to create checkout session", 500, "STRIPE_ERROR");
  }

  payment.transactionId = session.id;
  await payment.save();

  return {
    free: false as const,
    destinationTitle: destination.title,
    primaryBookingId,
    total,
    bookingIds: createdBookingIds,
    paymentId: String(payment._id),
    clientSecret: session.client_secret,
    sessionId: session.id,
  };
}
