"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { api, ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/admin/Toast";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";

interface UploadResponse {
  url: string;
}

/** Uploads a single image and swaps the preview in place (e.g. a thumbnail). */
export function ImageUploadField({
  value,
  onChange,
  folder,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  disabled?: boolean;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await api.upload<UploadResponse>("/uploads", file, folder);
      onChange(data.url);
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Image upload failed", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled || uploading}
      />
      {value ? (
        <div className="group relative h-40 w-full overflow-hidden rounded-lg border border-border bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Thumbnail preview" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-100"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-slate-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-muted text-ink-soft transition-colors hover:border-teal-400 hover:text-teal-600 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
          <span className="text-xs font-medium">{uploading ? "Uploading…" : "Click to upload an image"}</span>
          <span className="text-[11px] text-ink-soft">JPG, PNG, WEBP, or GIF — up to 5MB</span>
        </button>
      )}
    </div>
  );
}

/** Uploads one or more images and appends them to a gallery grid. */
export function GalleryUploadField({
  value,
  onChange,
  folder,
  disabled,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  disabled?: boolean;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const { data } = await api.upload<UploadResponse>("/uploads", file, folder);
          uploaded.push(data.url);
        } catch (err) {
          showToast(err instanceof ApiClientError ? `${file.name}: ${err.message}` : `${file.name} failed to upload`, "error");
        }
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || uploading}
      />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Gallery image ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              disabled={disabled || uploading}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-rose-600 group-hover:opacity-100"
              aria-label="Remove image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-surface-muted text-ink-soft transition-colors hover:border-teal-400 hover:text-teal-600 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[11px] font-medium">{uploading ? "Uploading…" : "Add photos"}</span>
        </button>
      </div>
      {value.length === 0 && !uploading ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
          <Plus className="h-3 w-3" /> No gallery images yet — add a few to showcase the destination.
        </p>
      ) : null}
    </div>
  );
}
