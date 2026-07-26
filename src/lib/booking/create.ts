import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Activity, Booking, Destination, TripPackage, User } from "@/models";
import { assertUserCanBook } from "@/lib/booking/eligibility";
import { tryClaimActivitySeat, tryClaimPackageSeat } from "@/lib/booking/seats";

export type CreateBookingInput = {
  destinationId: string;
  tripPackageId?: string | null;
  activityId?: string | null;
  usePassportDetails: boolean;
  notes?: string | null;
};

/** Heal legacy rows where status is verified but isVerified was never set. */
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

/**
 * Create a single booking (trip package seat and/or activity seat) for a
 * traveler. Mirrors the previous inline POST /api/bookings logic.
 */
export async function createBooking(
  sessionUserId: string,
  input: CreateBookingInput
) {
  await connectDB();

  const user = await User.findById(sessionUserId);
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

  let price = destination.estimatedBudget;
  let activityId: string | null = null;
  let tripPackageId: string | null = null;
  let travelDate = new Date();
  travelDate.setHours(0, 0, 0, 0);

  // --- Trip package booking (primary destination seat) ---
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

    const departure = new Date(tripPackage.departureDate);
    departure.setHours(0, 0, 0, 0);
    if (departure.getTime() < travelDate.getTime()) {
      throw new AppError("This trip has already departed", 400, "DEPARTED");
    }

    const existing = await Booking.findOne({
      userId: user._id,
      tripPackageId: tripPackage._id,
      status: { $in: ["pending", "confirmed"] },
    });
    if (existing) {
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

    price = tripPackage.price;
    travelDate = departure;
    tripPackageId = String(tripPackage._id);

    await Destination.findByIdAndUpdate(destination._id, {
      $inc: { bookedCount: 1 },
    });
  }

  // --- Activity-only booking (experience add-on) ---
  if (input.activityId) {
    const activity = await Activity.findById(input.activityId);
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

    // Activity-only bookings use activity price (not package) unless package also booked
    if (!tripPackageId) {
      price = activity.price;
    }
    activityId = String(activity._id);
    const claimedActivity = await tryClaimActivitySeat(activityId);
    if (!claimedActivity) {
      throw new AppError("This activity is fully booked", 409, "FULL");
    }
  }

  const booking = await Booking.create({
    userId: user._id,
    destinationId: destination._id,
    tripPackageId,
    activityId,
    travelDate,
    price,
    currency: "USD",
    status: "pending",
    paymentStatus: "pending",
    usePassportDetails: input.usePassportDetails,
    travelerPassport:
      input.usePassportDetails && user.passport
        ? {
            fullName: user.passport.fullName,
            nationality: user.passport.nationality,
            passportNumber: user.passport.passportNumber,
            passportExpiry: user.passport.passportExpiry,
            passportImage: user.passport.passportImage,
          }
        : null,
    notes: input.notes ?? null,
  });

  return { booking, destinationTitle: destination.title };
}
