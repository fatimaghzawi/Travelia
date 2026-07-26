"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, Toggle, MultiSelectChips } from "@/components/admin/FormFields";
import { ImageUploadField, GalleryUploadField } from "@/components/admin/ImageUploader";
import { PrimaryButton, SecondaryButton } from "@/components/admin/Buttons";
import { api, ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/admin/Toast";

export interface CategoryOption {
  _id: string;
  name: string;
}

export interface MoodOption {
  _id: string;
  name: string;
}

export interface DestinationRecord {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  country: string;
  city: string;
  address?: string;
  thumbnail: string;
  gallery: string[];
  estimatedBudget: number;
  recommendedDays: number;
  bestSeason?: string;
  capacity: number;
  requiresTravelDocuments: boolean;
  visaRequired: boolean;
  visaGuidance?: string;
  categoryId: string | { _id: string };
  moodIds: (string | { _id: string })[];
  isPublished: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function idOf(value: string | { _id: string } | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value._id;
}

const emptyForm: DestinationRecord = {
  title: "",
  slug: "",
  description: "",
  country: "",
  city: "",
  address: "",
  thumbnail: "",
  gallery: [],
  estimatedBudget: 500,
  recommendedDays: 3,
  bestSeason: "",
  capacity: 20,
  requiresTravelDocuments: true,
  visaRequired: false,
  visaGuidance: "",
  categoryId: "",
  moodIds: [],
  isPublished: false,
};

interface DestinationFormProps {
  initial?: DestinationRecord;
  categories: CategoryOption[];
  moods: MoodOption[];
  onSuccess: (destination: DestinationRecord & { _id: string }) => void;
  onCancel: () => void;
}

export function DestinationForm({ initial, categories, moods, onSuccess, onCancel }: DestinationFormProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(initial?._id);
  const [form, setForm] = useState<DestinationRecord>(() =>
    initial
      ? {
          ...initial,
          categoryId: idOf(initial.categoryId),
          moodIds: initial.moodIds.map(idOf),
          gallery: initial.gallery ?? [],
        }
      : emptyForm
  );
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function update<K extends keyof DestinationRecord>(key: K, value: DestinationRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTitleChange(value: string) {
    update("title", value);
    if (!slugTouched) update("slug", slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    // Explicitly whitelist only the fields the API's update/create schema
    // accepts. Do NOT spread `...form` here — when editing, `form` is
    // initialized from `initial`, which carries server-managed fields
    // (_id, ratingAverage, reviewCount, bookedCount, createdBy, createdAt,
    // updatedAt, remainingSlots, isFullyBooked, id). Sending those back
    // trips the backend's strict validation ("Unrecognized keys").
    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      country: form.country,
      city: form.city,
      address: form.address || undefined,
      thumbnail: form.thumbnail,
      gallery: form.gallery,
      estimatedBudget: Number(form.estimatedBudget),
      recommendedDays: Number(form.recommendedDays),
      bestSeason: form.bestSeason || undefined,
      capacity: Number(form.capacity),
      requiresTravelDocuments: form.requiresTravelDocuments,
      visaRequired: form.visaRequired,
      visaGuidance: form.visaGuidance || undefined,
      categoryId: idOf(form.categoryId),
      moodIds: form.moodIds.map(idOf),
      isPublished: form.isPublished,
    };

    try {
      const { data } = isEdit
        ? await api.patch<DestinationRecord & { _id: string }>(
            `/destinations/${initial?._id}`,
            payload
          )
        : await api.post<DestinationRecord & { _id: string }>("/destinations", payload);
      showToast(isEdit ? "Destination updated" : "Destination created");
      onSuccess(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (Array.isArray(err.errors)) {
          const fieldErrors: Record<string, string> = {};
          for (const item of err.errors as { path?: string[]; message: string }[]) {
            const key = item.path?.[item.path.length - 1];
            if (key) fieldErrors[key] = item.message;
          }
          setErrors(fieldErrors);
        }
        showToast(err.message, "error");
      } else {
        showToast("Something went wrong", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title}>
          <TextInput
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Santorini, Greece"
            required
          />
        </Field>
        <Field label="Slug" required error={errors.slug} hint="Used in the public URL">
          <TextInput
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", slugify(e.target.value));
            }}
            required
          />
        </Field>
      </div>

      <Field label="Description" required error={errors.description}>
        <TextArea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Iconic sunsets, whitewashed villages, and breathtaking Aegean views."
          required
          minLength={20}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Country" required error={errors.country}>
          <TextInput value={form.country} onChange={(e) => update("country", e.target.value)} required />
        </Field>
        <Field label="City" required error={errors.city}>
          <TextInput value={form.city} onChange={(e) => update("city", e.target.value)} required />
        </Field>
        <Field label="Address" error={errors.address}>
          <TextInput value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
        </Field>
      </div>

      <Field label="Thumbnail image" required error={errors.thumbnail} hint="Shown on destination cards and listings">
        <ImageUploadField
          value={form.thumbnail}
          onChange={(url) => update("thumbnail", url)}
          folder="destinations"
          disabled={saving}
        />
      </Field>

      <Field label="Gallery images" hint="Extra photos shown on the destination page">
        <GalleryUploadField
          value={form.gallery}
          onChange={(urls) => update("gallery", urls)}
          folder="destinations"
          disabled={saving}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Est. budget ($)" required error={errors.estimatedBudget}>
          <TextInput
            type="number"
            min={0}
            value={form.estimatedBudget}
            onChange={(e) => update("estimatedBudget", Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Recommended days" required error={errors.recommendedDays}>
          <TextInput
            type="number"
            min={1}
            value={form.recommendedDays}
            onChange={(e) => update("recommendedDays", Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Best season">
          <TextInput value={form.bestSeason ?? ""} onChange={(e) => update("bestSeason", e.target.value)} placeholder="Summer" />
        </Field>
        <Field label="Capacity (seats)" required error={errors.capacity}>
          <TextInput
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => update("capacity", Number(e.target.value))}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category" required error={errors.categoryId}>
          <Select value={idOf(form.categoryId)} onChange={(e) => update("categoryId", e.target.value)} required>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Moods">
          <MultiSelectChips
            options={moods.map((m) => ({ id: m._id, label: m.name }))}
            selected={form.moodIds.map(idOf)}
            onChange={(ids) => update("moodIds", ids)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Requires travel documents</p>
            <p className="text-xs text-ink-soft">Traveler must confirm passport before booking</p>
          </div>
          <Toggle checked={form.requiresTravelDocuments} onChange={(v) => update("requiresTravelDocuments", v)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Visa required</p>
            <p className="text-xs text-ink-soft">Show visa guidance on the destination page</p>
          </div>
          <Toggle checked={form.visaRequired} onChange={(v) => update("visaRequired", v)} />
        </div>
      </div>

      {form.visaRequired ? (
        <Field label="Visa guidance" error={errors.visaGuidance}>
          <TextArea
            value={form.visaGuidance ?? ""}
            onChange={(e) => update("visaGuidance", e.target.value)}
            placeholder="U.S. citizens may need a Schengen visa to enter…"
          />
        </Field>
      ) : null}

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Published</p>
          <p className="text-xs text-ink-soft">Visible to travelers on the public site</p>
        </div>
        <Toggle checked={form.isPublished} onChange={(v) => update("isPublished", v)} />
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create destination"}
        </PrimaryButton>
      </div>
    </form>
  );
}
