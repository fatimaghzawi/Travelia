"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, Toggle } from "@/components/admin/FormFields";
import { PrimaryButton, SecondaryButton } from "@/components/admin/Buttons";
import { api, ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/admin/Toast";

export interface ActivityRecord {
  _id?: string;
  destinationId: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  location?: string;
  image: string;
  category: string;
  openingHours?: string;
  capacity: number;
  isAvailable: boolean;
}

const categories = [
  "adventure",
  "food",
  "culture",
  "nature",
  "shopping",
  "entertainment",
  "sports",
  "relaxation",
  "other",
];

const emptyForm = (destinationId: string): ActivityRecord => ({
  destinationId,
  title: "",
  description: "",
  duration: 60,
  price: 0,
  location: "",
  image: "",
  category: "other",
  openingHours: "",
  capacity: 20,
  isAvailable: true,
});

interface ActivityFormProps {
  destinationId: string;
  initial?: ActivityRecord;
  onSuccess: (activity: ActivityRecord & { _id: string }) => void;
  onCancel: () => void;
}

export function ActivityForm({ destinationId, initial, onSuccess, onCancel }: ActivityFormProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(initial?._id);
  const [form, setForm] = useState<ActivityRecord>(initial ?? emptyForm(destinationId));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof ActivityRecord>(key: K, value: ActivityRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      ...form,
      duration: Number(form.duration),
      price: Number(form.price),
      capacity: Number(form.capacity),
      location: form.location || undefined,
      openingHours: form.openingHours || undefined,
    };

    try {
      const { data } = isEdit
        ? await api.patch<ActivityRecord & { _id: string }>(`/activities/${initial?._id}`, payload)
        : await api.post<ActivityRecord & { _id: string }>("/activities", payload);
      showToast(isEdit ? "Activity updated" : "Activity added");
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
      <Field label="Title" required error={errors.title}>
        <TextInput value={form.title} onChange={(e) => update("title", e.target.value)} required />
      </Field>
      <Field label="Description" required error={errors.description}>
        <TextArea value={form.description} onChange={(e) => update("description", e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Duration (minutes)" required error={errors.duration}>
          <TextInput type="number" min={0} value={form.duration} onChange={(e) => update("duration", Number(e.target.value))} required />
        </Field>
        <Field label="Price ($)" required error={errors.price}>
          <TextInput type="number" min={0} value={form.price} onChange={(e) => update("price", Number(e.target.value))} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Location">
          <TextInput value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} />
        </Field>
        <Field label="Opening hours">
          <TextInput
            value={form.openingHours ?? ""}
            onChange={(e) => update("openingHours", e.target.value)}
            placeholder="9:00 AM – 6:00 PM"
          />
        </Field>
      </div>
      <Field label="Image URL" required error={errors.image}>
        <TextInput value={form.image} onChange={(e) => update("image", e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" required>
          <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacity (seats)" required error={errors.capacity}>
          <TextInput type="number" min={1} value={form.capacity} onChange={(e) => update("capacity", Number(e.target.value))} required />
        </Field>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Available for booking</p>
          <p className="text-xs text-ink-soft">Turn off to temporarily hide this activity</p>
        </div>
        <Toggle checked={form.isAvailable} onChange={(v) => update("isAvailable", v)} />
      </div>
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add activity"}
        </PrimaryButton>
      </div>
    </form>
  );
}
