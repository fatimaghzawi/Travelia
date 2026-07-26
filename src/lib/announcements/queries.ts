import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/api/errors";
import { Announcement } from "@/models";
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/validators/announcement.validator";

export type PageParams = { page: number; limit: number };

export async function listAnnouncements({ page, limit }: PageParams) {
  await connectDB();
  const [items, total] = await Promise.all([
    Announcement.find({})
      .populate("createdBy", "firstName lastName")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit),
    Announcement.countDocuments({}),
  ]);
  return { items, total };
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  createdBy: string
) {
  await connectDB();
  return Announcement.create({ ...input, createdBy });
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
) {
  await connectDB();
  const existing = await Announcement.findById(id);
  if (!existing) throw new AppError("Announcement not found", 404, "NOT_FOUND");

  const wasActive = existing.isActive;
  Object.assign(existing, input);

  // Re-publishing a draft (or reactivating) should notify once more
  if (!wasActive && existing.isActive) {
    existing.sentAt = null;
  }

  await existing.save();
  return existing;
}

export async function deleteAnnouncement(id: string) {
  await connectDB();
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) throw new AppError("Announcement not found", 404, "NOT_FOUND");
}
