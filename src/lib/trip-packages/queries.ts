import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/handler";
import { Booking, Destination, TripPackage } from "@/models";
import type {
  CreateTripPackageInput,
  UpdateTripPackageInput,
} from "@/validators/trip-package.validator";
import type { PaginationInput } from "@/validators/common";

export type TripPackageQuery = PaginationInput & {
  destinationId?: string | null;
  status?: "open" | "closed" | "full";
  isPublished?: boolean;
  bookableOnly?: boolean;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function listTripPackages(
  query: TripPackageQuery,
  { isAdmin }: { isAdmin: boolean }
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.destinationId) filter.destinationId = query.destinationId;
  if (query.status) filter.status = query.status;

  if (typeof query.isPublished === "boolean") {
    if (isAdmin) {
      filter.isPublished = query.isPublished;
    } else {
      filter.isPublished = true;
    }
  } else if (!isAdmin) {
    filter.isPublished = true;
  }

  if (query.bookableOnly) {
    filter.isPublished = true;
    filter.status = { $in: ["open"] };
    filter.departureDate = { $gte: startOfToday() };
  }

  const [items, total] = await Promise.all([
    TripPackage.find(filter)
      .populate("destinationId", "title slug city country thumbnail")
      .sort("departureDate")
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean({ virtuals: true }),
    TripPackage.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getTripPackageById(
  id: string,
  { isAdmin }: { isAdmin: boolean }
) {
  await connectDB();

  const tripPackage = await TripPackage.findById(id)
    .populate("destinationId", "title slug city country thumbnail")
    .lean({ virtuals: true });

  if (!tripPackage) {
    throw new AppError("Trip package not found", 404, "NOT_FOUND");
  }
  if (!isAdmin && !tripPackage.isPublished) {
    throw new AppError("Trip package not found", 404, "NOT_FOUND");
  }

  return tripPackage;
}

export async function createTripPackage(input: CreateTripPackageInput) {
  await connectDB();

  const destination = await Destination.findById(input.destinationId);
  if (!destination) {
    throw new AppError("Destination not found", 404, "NOT_FOUND");
  }

  return TripPackage.create(input);
}

export async function updateTripPackage(
  id: string,
  input: UpdateTripPackageInput
) {
  await connectDB();

  const tripPackage = await TripPackage.findById(id);
  if (!tripPackage) {
    throw new AppError("Trip package not found", 404, "NOT_FOUND");
  }

  if (input.capacity !== undefined && input.capacity < tripPackage.bookedCount) {
    throw new AppError(
      `Capacity cannot be less than booked seats (${tripPackage.bookedCount})`,
      400,
      "CAPACITY_TOO_LOW"
    );
  }

  Object.assign(tripPackage, input);

  if (
    tripPackage.departureDate &&
    tripPackage.returnDate &&
    tripPackage.returnDate < tripPackage.departureDate
  ) {
    throw new AppError(
      "Return date must be on or after departure date",
      400,
      "INVALID_DATES"
    );
  }

  await tripPackage.save();
  return tripPackage;
}

export async function deleteTripPackage(id: string) {
  await connectDB();

  const tripPackage = await TripPackage.findById(id);
  if (!tripPackage) {
    throw new AppError("Trip package not found", 404, "NOT_FOUND");
  }

  const activeBookings = await Booking.countDocuments({
    tripPackageId: id,
    status: { $in: ["pending", "confirmed"] },
  });
  if (activeBookings > 0) {
    throw new AppError(
      "Cannot delete a package with active bookings",
      409,
      "HAS_BOOKINGS"
    );
  }

  await tripPackage.deleteOne();
  return tripPackage;
}
