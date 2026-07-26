import type { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { objectIdSchema } from "@/validators/common";
import {
  journalMediaUrl,
  journalStorageDir,
} from "@/lib/media/journals";
import { getTripForJournalUpload } from "@/lib/trips/queries";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/pjpeg",
]);

const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const EXT_FROM_NAME: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
};

const MAX_BYTES = 8 * 1024 * 1024;

function resolveExt(file: File) {
  const mime = (file.type || "").toLowerCase();
  if (EXT_FROM_MIME[mime]) return EXT_FROM_MIME[mime];
  const nameExt = file.name.split(".").pop()?.toLowerCase() || "";
  return EXT_FROM_NAME[nameExt] || null;
}

export const POST = apiHandler(async (request: NextRequest, context) => {
  const user = await requireTraveler();
  const { id } = await (context as Ctx).params;
  const tripId = objectIdSchema.parse(id);

  await getTripForJournalUpload(user.id, tripId);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    throw new AppError("Image file is required", 400, "MISSING_FILE");
  }

  const mime = (file.type || "").toLowerCase();
  const ext = resolveExt(file);
  if (!ext || (mime && !ALLOWED.has(mime) && !mime.startsWith("image/"))) {
    throw new AppError(
      "Photo must be JPG, PNG, GIF, or WebP",
      400,
      "INVALID_FILE_TYPE"
    );
  }
  if (file.size > MAX_BYTES) {
    throw new AppError("Photo must be 8MB or smaller", 400, "FILE_TOO_LARGE");
  }

  const dir = journalStorageDir(tripId);
  await mkdir(dir, { recursive: true });

  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);

  return ok({ url: journalMediaUrl(tripId, name) }, "Photo uploaded");
});
