import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/session";
import { storeUpload } from "@/lib/storage/blob";

const MAX_FILE_SIZE = Math.floor(4.5 * 1024 * 1024); // Vercel serverless body limit

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const ALLOWED_FOLDERS = new Set(["destinations"]);

/**
 * Admin-only image upload. Accepts multipart/form-data with a `file` field
 * (and optional `folder` field). Stores on Vercel Blob when configured,
 * otherwise under public/uploads/<folder>/ for local development.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("file");
  const folderRaw = formData.get("folder");
  const folder =
    typeof folderRaw === "string" && ALLOWED_FOLDERS.has(folderRaw)
      ? folderRaw
      : "destinations";

  if (!(file instanceof File)) {
    throw new AppError("No image file was provided", 400, "MISSING_FILE");
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new AppError(
      "Only JPG, PNG, WEBP, or GIF images are allowed",
      400,
      "INVALID_FILE_TYPE"
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      "Image must be smaller than 4.5MB",
      400,
      "FILE_TOO_LARGE"
    );
  }

  const filename = `${randomUUID()}.${extension}`;
  const url = await storeUpload({
    pathname: `${folder}/${filename}`,
    data: file,
    contentType: file.type,
  });

  return ok({ url }, "Image uploaded");
});
