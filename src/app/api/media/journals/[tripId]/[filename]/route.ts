import type { NextRequest } from "next/server";
import { readFile, access } from "fs/promises";
import path from "path";
import { constants } from "fs";
import { auth } from "@/auth";
import { objectIdSchema } from "@/validators/common";
import {
  checkTripJournalMediaAccess,
  journalStorageDir,
} from "@/lib/media/journals";
import { getPrivateBlob } from "@/lib/storage/blob";

type Ctx = { params: Promise<{ tripId: string; filename: string }> };

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Auth-gated journal photo serving.
 * Prefers private Vercel Blob, then local /storage, then legacy /public paths.
 */
export async function GET(_request: NextRequest, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.status !== "active") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tripId: rawTripId, filename: rawFilename } = await context.params;
  let tripId: string;
  try {
    tripId = objectIdSchema.parse(rawTripId);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const filename = decodeURIComponent(rawFilename || "");
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return new Response("Not found", { status: 404 });
  }

  const accessCheck = await checkTripJournalMediaAccess(tripId, {
    id: session.user.id,
    role: session.user.role,
  });
  if (!accessCheck.allowed) {
    return accessCheck.reason === "NOT_FOUND"
      ? new Response("Not found", { status: 404 })
      : new Response("Forbidden", { status: 403 });
  }

  const blobPath = `journals/${tripId}/${filename}`;
  const blob = await getPrivateBlob(blobPath);
  if (blob?.statusCode === 200 && blob.stream) {
    return new Response(blob.stream, {
      status: 200,
      headers: {
        "Content-Type":
          blob.blob.contentType ||
          MIME[filename.split(".").pop()?.toLowerCase() || ""] ||
          "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const privatePath = path.join(journalStorageDir(tripId), filename);
  const legacyPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "journals",
    tripId,
    filename
  );

  let filePath = privatePath;
  try {
    await access(privatePath, constants.R_OK);
  } catch {
    try {
      await access(legacyPath, constants.R_OK);
      filePath = legacyPath;
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const buffer = await readFile(filePath);
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
