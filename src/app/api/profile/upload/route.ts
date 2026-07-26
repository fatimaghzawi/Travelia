import type { NextRequest } from "next/server";
import { apiHandler, AppError } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireTraveler } from "@/lib/auth/session";
import { saveProfileUpload, type UploadKind } from "@/lib/profile/upload";
import { serializeProfile } from "@/lib/profile/serialize";
import { setAvatar } from "@/lib/profile/queries";
import { z } from "zod";

const kindSchema = z.enum(["avatar", "passport"]);

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireTraveler();
  const form = await request.formData();
  const kind = kindSchema.parse(String(form.get("kind") || ""));
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new AppError("File is required", 400, "FILE_REQUIRED");
  }

  const url = await saveProfileUpload(file, kind as UploadKind);

  if (kind === "avatar") {
    const user = await setAvatar(session.id, url);
    return ok(
      { url, profile: serializeProfile(user) },
      "Avatar uploaded"
    );
  }

  return ok({ url }, "Passport image uploaded");
});
