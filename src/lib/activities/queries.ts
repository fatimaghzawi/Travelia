import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/handler";
import { Activity, Booking, Destination } from "@/models";
import type {
  CreateActivityInput,
  UpdateActivityInput,
} from "@/validators/activity.validator";
import type { PaginationInput } from "@/validators/common";

export type ListActivitiesParams = PaginationInput & {
  destinationId?: string;
};

export async function listActivities(query: ListActivitiesParams) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.destinationId) {
    filter.destinationId = query.destinationId;
  }
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .populate("destinationId", "title slug city country")
      .sort("-createdAt")
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Activity.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getActivityById(id: string) {
  await connectDB();
  const activity = await Activity.findById(id).populate(
    "destinationId",
    "title slug city country"
  );
  if (!activity) throw new AppError("Activity not found", 404, "NOT_FOUND");
  return activity;
}

export async function createActivity(input: CreateActivityInput) {
  await connectDB();
  const destination = await Destination.findById(input.destinationId);
  if (!destination) {
    throw new AppError("Destination not found", 404, "NOT_FOUND");
  }
  return Activity.create(input);
}

export async function updateActivity(id: string, input: UpdateActivityInput) {
  await connectDB();
  const activity = await Activity.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!activity) throw new AppError("Activity not found", 404, "NOT_FOUND");
  return activity;
}

export async function deleteActivity(id: string) {
  await connectDB();

  const activeBookings = await Booking.countDocuments({
    activityId: id,
    status: { $in: ["pending", "confirmed"] },
  });
  if (activeBookings > 0) {
    throw new AppError(
      `Cannot delete — ${activeBookings} active booking(s) reference this activity`,
      409,
      "IN_USE"
    );
  }

  const activity = await Activity.findByIdAndDelete(id);
  if (!activity) throw new AppError("Activity not found", 404, "NOT_FOUND");
  return activity;
}
