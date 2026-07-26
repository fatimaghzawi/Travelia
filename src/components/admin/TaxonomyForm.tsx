"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Toggle } from "@/components/admin/FormFields";
import { PrimaryButton, SecondaryButton } from "@/components/admin/Buttons";
import { api, ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/admin/Toast";

export interface TaxonomyRecord {
  _id?: string;
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  isActive: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface TaxonomyFormProps {
  resource: "categories" | "moods";
  initial?: TaxonomyRecord;
  onSuccess: (record: TaxonomyRecord & { _id: string }) => void;
  onCancel: () => void;
}

export function TaxonomyForm({ resource, initial, onSuccess, onCancel }: TaxonomyFormProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(initial?._id);
  const [form, setForm] = useState<TaxonomyRecord>(
    initial ?? { name: "", icon: "", description: "", isActive: true }
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof TaxonomyRecord>(key: K, value: TaxonomyRecord[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      icon: form.icon || undefined,
      description: form.description || undefined,
      isActive: form.isActive,
    };

    try {
      const { data } = isEdit
        ? await api.patch<TaxonomyRecord & { _id: string }>(`/${resource}/${initial?._id}`, payload)
        : await api.post<TaxonomyRecord & { _id: string }>(`/${resource}`, payload);
      showToast(isEdit ? "Saved" : "Created");
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
      <Field label="Name" required error={errors.name}>
        <TextInput value={form.name} onChange={(e) => update("name", e.target.value)} required />
      </Field>
      <Field label="Icon" hint="Emoji or icon URL, shown in filters">
        <TextInput value={form.icon ?? ""} onChange={(e) => update("icon", e.target.value)} placeholder="🏖️" />
      </Field>
      <Field label="Description">
        <TextArea value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} />
      </Field>
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">Active</p>
          <p className="text-xs text-ink-soft">Inactive items are hidden from filters</p>
        </div>
        <Toggle checked={form.isActive} onChange={(v) => update("isActive", v)} />
      </div>
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </PrimaryButton>
      </div>
    </form>
  );
}
