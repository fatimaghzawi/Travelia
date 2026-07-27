import { randomBytes } from "crypto";
import { AppError } from "@/lib/api/errors";
import { storeUpload } from "@/lib/storage/blob";

const MAX_BYTES = {
  avatar: 2 * 1024 * 1024,
  passport: Math.floor(4.5 * 1024 * 1024),
} as const;

const ALLOWED = {
  avatar: new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]),
  passport: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]),
} as const;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type UploadKind = keyof typeof MAX_BYTES;

export async function saveProfileUpload(
  file: File,
  kind: UploadKind
): Promise<string> {
  if (!ALLOWED[kind].has(file.type)) {
    throw new AppError(
      kind === "avatar"
        ? "Avatar must be JPG, PNG, GIF, or WebP"
        : "Passport file must be JPG, PNG, WebP, or PDF",
      400,
      "INVALID_FILE_TYPE"
    );
  }

  if (file.size > MAX_BYTES[kind]) {
    throw new AppError(
      kind === "avatar"
        ? "Avatar must be 2MB or smaller"
        : "Passport file must be 4.5MB or smaller",
      400,
      "FILE_TOO_LARGE"
    );
  }

  const folder = kind === "avatar" ? "avatars" : "passports";
  const ext = EXT[file.type] || "bin";
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  return storeUpload({
    pathname: `${folder}/${name}`,
    data: file,
    contentType: file.type,
  });
}
