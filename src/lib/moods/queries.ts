import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/handler";
import { Mood, Destination } from "@/models";
import type {
  CreateMoodInput,
  UpdateMoodInput,
} from "@/validators/mood.validator";
import type { PaginationInput } from "@/validators/common";

export async function listMoods(query: PaginationInput) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: "i" };
  }

  const [items, total] = await Promise.all([
    Mood.find(filter)
      .sort(query.sort ?? "name")
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Mood.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getMoodById(id: string) {
  await connectDB();
  const mood = await Mood.findById(id);
  if (!mood) throw new AppError("Mood not found", 404, "NOT_FOUND");
  return mood;
}

export async function createMood(input: CreateMoodInput) {
  await connectDB();
  return Mood.create(input);
}

export async function updateMood(id: string, input: UpdateMoodInput) {
  await connectDB();
  const mood = await Mood.findByIdAndUpdate(id, input, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!mood) throw new AppError("Mood not found", 404, "NOT_FOUND");
  return mood;
}

export async function deleteMood(id: string) {
  await connectDB();
  const inUse = await Destination.countDocuments({ moodIds: id });
  if (inUse > 0) {
    throw new AppError(
      `Cannot delete — ${inUse} destination(s) use this mood`,
      409,
      "IN_USE"
    );
  }
  const mood = await Mood.findByIdAndDelete(id);
  if (!mood) throw new AppError("Mood not found", 404, "NOT_FOUND");
  return mood;
}
