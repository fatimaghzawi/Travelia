import type { NextRequest } from "next/server";
import {
  PUBLIC_BLOB_FOLDERS,
  getPrivateBlob,
} from "@/lib/storage/blob";

type Ctx = { params: Promise<{ pathname: string[] }> };

/**
 * Streams private Vercel Blob objects for public-facing assets
 * (destination photos, avatars, passports). Journal photos stay on the
 * auth-gated /api/media/journals route.
 */
export async function GET(_request: NextRequest, context: Ctx) {
  const segments = (await context.params).pathname || [];
  if (segments.length < 2) {
    return new Response("Not found", { status: 404 });
  }

  const folder = decodeURIComponent(segments[0] || "");
  if (!PUBLIC_BLOB_FOLDERS.has(folder)) {
    return new Response("Not found", { status: 404 });
  }

  const parts = segments.map((part) => decodeURIComponent(part));
  if (parts.some((part) => !part || part.includes("..") || part.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }

  const pathname = parts.join("/");
  const result = await getPrivateBlob(pathname);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    status: 200,
    headers: {
      "Content-Type":
        result.blob.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
