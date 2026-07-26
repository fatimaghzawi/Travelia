import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { apiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Whitelisted so the client can never write outside public/uploads via a
// crafted `folder` value (e.g. "../../etc").
const ALLOWED_FOLDERS = new Set(["destinations"]);

/**
 * Admin-only image upload. Accepts multipart/form-data with a `file` field
 * (and optional `folder` field), saves it under public/uploads/<folder>/,
 * and returns the app-relative path to store on the record (thumbnail,
 * gallery, etc.) — matches the `/uploads/...` shape `imageUploadSchema`
 * already expects.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("file");
  const folderRaw = formData.get("folder");
  const folder = typeof folderRaw === "string" && ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "destinations";

  if (!(file instanceof File)) {
    throw new AppError("No image file was provided", 400, "MISSING_FILE");
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new AppError("Only JPG, PNG, WEBP, or GIF images are allowed", 400, "INVALID_FILE_TYPE");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError("Image must be smaller than 5MB", 400, "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return ok({ url: `/uploads/${folder}/${filename}` }, "Image uploaded");
});
