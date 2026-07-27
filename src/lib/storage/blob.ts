import { get, put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { AppError } from "@/lib/api/errors";

type StoreUploadOptions = {
  /** Path inside the bucket, e.g. `destinations/abc.jpg` */
  pathname: string;
  data: Buffer | Blob | File | ArrayBuffer;
  contentType: string;
  /**
   * When true (and no Blob token), files go under `storage/uploads/` locally.
   * Otherwise under `public/uploads/`.
   */
  privateLocal?: boolean;
  /**
   * How the stored file is exposed in the app:
   * - `proxy` → `/api/media/blob/...` (destinations, avatars, passports)
   * - `pathname` → raw store pathname (caller builds its own URL, e.g. journals)
   */
  returnAs?: "proxy" | "pathname";
};

/** Folders safe to serve through the public blob proxy (no auth). */
export const PUBLIC_BLOB_FOLDERS = new Set([
  "destinations",
  "avatars",
  "passports",
]);

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
}

function blobStoreId() {
  return (
    process.env.BLOB_STORE_ID?.trim() ||
    process.env.vercel_blob_rw_travelia_STORE_ID?.trim() ||
    ""
  );
}

function blobAuthOptions() {
  const token = blobToken();
  const storeId = blobStoreId();
  return {
    ...(token ? { token } : {}),
    ...(storeId ? { storeId } : {}),
  };
}

/** Same-origin URL that streams a private blob through our API. */
export function blobProxyUrl(pathname: string) {
  const clean = pathname.replace(/^\/+/, "");
  return `/api/media/blob/${clean
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

/**
 * Persist an upload to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.
 * Falls back to the local filesystem for local/dev without a token.
 *
 * Uses `access: 'private'` to match private Blob stores from the Vercel dashboard.
 */
export async function storeUpload({
  pathname,
  data,
  contentType,
  privateLocal = false,
  returnAs = "proxy",
}: StoreUploadOptions): Promise<string> {
  const cleanPath = pathname.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!cleanPath || cleanPath.includes("..")) {
    throw new AppError("Invalid upload path", 400, "INVALID_UPLOAD_PATH");
  }

  if (usingVercelBlob()) {
    await put(cleanPath, data, {
      access: "private",
      contentType,
      addRandomSuffix: false,
      ...blobAuthOptions(),
    });

    if (returnAs === "pathname") return cleanPath;
    return blobProxyUrl(cleanPath);
  }

  const body =
    data instanceof Buffer
      ? data
      : Buffer.from(
          data instanceof ArrayBuffer
            ? data
            : await (data as Blob).arrayBuffer()
        );

  const baseDir = privateLocal
    ? path.join(process.cwd(), "storage", "uploads")
    : path.join(process.cwd(), "public", "uploads");
  const fullPath = path.join(baseDir, cleanPath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, body);

  if (privateLocal || returnAs === "pathname") {
    return cleanPath;
  }

  return `/uploads/${cleanPath.replace(/\\/g, "/")}`;
}

export function usingVercelBlob() {
  return Boolean(blobToken() || blobStoreId());
}

/**
 * Stream a private blob by pathname. Returns null when Blob is not configured
 * or the object is missing.
 */
export async function getPrivateBlob(pathname: string) {
  if (!usingVercelBlob()) return null;

  const cleanPath = pathname.replace(/^\/+/, "");
  if (!cleanPath || cleanPath.includes("..")) return null;

  try {
    return await get(cleanPath, {
      access: "private",
      ...blobAuthOptions(),
    });
  } catch {
    return null;
  }
}
