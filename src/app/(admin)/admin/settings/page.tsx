"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/admin/Topbar";
import { Field, TextInput } from "@/components/admin/FormFields";
import { PrimaryButton } from "@/components/admin/Buttons";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface Me {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "" });

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    api.get<Me>("/profile").then(({ data }) => {
      setMe(data);
      setProfileForm({ firstName: data.firstName, lastName: data.lastName, phone: data.phone ?? "" });
    });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setProfileSaving(true);
    try {
      await api.patch("/profile", profileForm);
      showToast("Profile updated");
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to update profile", "error");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      await api.post("/profile/password", passwordForm);
      showToast("Password changed");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to change password", "error");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your admin account" />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="space-y-5 admin-panel p-6">
          <h3 className="text-base font-semibold text-ink">Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <TextInput value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} />
            </Field>
            <Field label="Last name">
              <TextInput value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} />
            </Field>
          </div>
          <Field label="Email">
            <TextInput value={me?.email ?? ""} disabled className="opacity-60" />
          </Field>
          <Field label="Phone">
            <TextInput value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <PrimaryButton type="submit" disabled={profileSaving}>
            {profileSaving ? "Saving…" : "Save profile"}
          </PrimaryButton>
        </form>

        <form onSubmit={changePassword} className="space-y-5 admin-panel p-6">
          <h3 className="text-base font-semibold text-ink">Change password</h3>
          <Field label="Current password" required>
            <TextInput
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </Field>
          <Field label="New password" required hint="At least 8 characters">
            <TextInput
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm new password" required>
            <TextInput
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
          </Field>
          <PrimaryButton type="submit" disabled={passwordSaving}>
            {passwordSaving ? "Updating…" : "Update password"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
