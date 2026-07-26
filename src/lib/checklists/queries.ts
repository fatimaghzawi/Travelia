import type mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Checklist, Trip } from "@/models";
import type { IChecklistItem } from "@/models/checklist.model";
import type {
  ToggleChecklistItemInput,
  UpdateChecklistInput,
} from "@/validators/checklist.validator";

async function requireEditableTrip(
  tripId: mongoose.Types.ObjectId | string,
  userId: string
) {
  const trip = await Trip.findOne({ _id: tripId, userId }).select("status");
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");
  if (trip.status === "cancelled") {
    throw new AppError("Cannot edit a cancelled trip", 400, "CANCELLED");
  }
  return trip;
}

export async function listChecklistsForTrip(tripId: string, userId: string) {
  await connectDB();
  const trip = await Trip.findOne({ _id: tripId, userId }).select("_id");
  if (!trip) throw new AppError("Trip not found", 404, "NOT_FOUND");

  return Checklist.find({ tripId, userId }).sort("createdAt").lean();
}

export async function createChecklistForTrip(
  tripId: string,
  userId: string,
  input: { title: string; items: { text: string; completed: boolean }[] }
) {
  await connectDB();
  await requireEditableTrip(tripId, userId);

  return Checklist.create({
    tripId,
    userId,
    title: input.title,
    items: input.items,
  });
}

export type ChecklistPatchInput =
  | ToggleChecklistItemInput
  | (UpdateChecklistInput & {
      addItem?: string;
      removeItemId?: string;
    });

export async function updateChecklist(
  checklistId: string,
  userId: string,
  input: ChecklistPatchInput
) {
  await connectDB();
  const checklist = await Checklist.findOne({ _id: checklistId, userId });
  if (!checklist) throw new AppError("Checklist not found", 404, "NOT_FOUND");

  await requireEditableTrip(checklist.tripId, userId);

  if ("itemId" in input && "completed" in input) {
    const items = checklist.items as unknown as Array<
      IChecklistItem & { _id?: { toString(): string }; id?: string }
    >;
    const item = items.find(
      (entry) => String(entry._id ?? entry.id ?? "") === String(input.itemId)
    );
    if (!item) throw new AppError("Checklist item not found", 404, "NOT_FOUND");
    item.completed = input.completed;
  } else {
    if (input.title !== undefined) checklist.title = input.title;
    if (input.items !== undefined) {
      checklist.items = input.items as typeof checklist.items;
    }
    if (input.addItem) {
      checklist.items.push({ text: input.addItem, completed: false });
    }
    if (input.removeItemId) {
      checklist.items = checklist.items.filter(
        (entry) =>
          String((entry as { _id?: unknown })._id ?? "") !==
          String(input.removeItemId)
      ) as typeof checklist.items;
    }
  }

  await checklist.save();
  return checklist;
}
