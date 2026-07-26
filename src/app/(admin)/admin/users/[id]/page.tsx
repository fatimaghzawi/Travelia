"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, ShieldX, Ban, CheckCircle2, UserX, UserCheck } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { SecondaryButton, PrimaryButton } from "@/components/admin/Buttons";
import { Badge } from "@/components/admin/Badge";
import { Field, TextArea, Select } from "@/components/admin/FormFields";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { api, ApiClientError } from "@/lib/api/client";

interface UserDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  bio?: string;
  image?: string;
  role: "TRAVELER" | "ADMIN";
  status: "active" | "inactive" | "blocked";
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  verificationNote?: string;
  passport?: {
    fullName: string;
    nationality: string;
    passportNumber: string;
    passportExpiry: string;
    passportImage: string;
  };
  createdAt: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [verifyModal, setVerifyModal] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [manualVerifyConfirmOpen, setManualVerifyConfirmOpen] = useState(false);
  const [manualVerifySaving, setManualVerifySaving] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<UserDetail>(`/users/${id}`);
      setUser(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load user", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function handleVerify(action: "approve" | "reject") {
    setSubmitting(true);
    try {
      await api.post(`/users/${id}/verify`, { action, note: note || undefined });
      showToast(action === "approve" ? "Passport approved" : "Passport rejected");
      setVerifyModal(null);
      setNote("");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to update verification", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualVerify() {
    setManualVerifySaving(true);
    try {
      await api.post(`/users/${id}/verify`, { action: "approve", force: true });
      showToast("User manually verified");
      setManualVerifyConfirmOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to verify user", "error");
    } finally {
      setManualVerifySaving(false);
    }
  }

  async function handleFieldUpdate(field: "role" | "status", value: string) {
    try {
      await api.patch(`/users/${id}`, { [field]: value });
      showToast("User updated");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to update user", "error");
    }
  }

  async function handleDeactivate() {
    setStatusSaving(true);
    try {
      await api.patch(`/users/${id}`, { status: "inactive" });
      showToast("Account deactivated");
      setDeactivateConfirmOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to deactivate account", "error");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleActivate() {
    setStatusSaving(true);
    try {
      await api.patch(`/users/${id}`, { status: "active" });
      showToast("Account activated");
      load();
    } catch (err) {
      showToast(err instanceof ApiClientError ? err.message : "Failed to activate account", "error");
    } finally {
      setStatusSaving(false);
    }
  }

  if (!user) {
    return (
      <div>
        <Topbar title="User profile" />
        <div className="p-8 text-sm text-ink-soft">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title={`${user.firstName} ${user.lastName}`}
        subtitle={user.email}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={user.status === "active" ? "success" : user.status === "blocked" ? "danger" : "neutral"}>
              {user.status}
            </Badge>
            {user.status === "active" ? (
              <SecondaryButton
                onClick={() => setDeactivateConfirmOpen(true)}
                className="!border-rose-200 !text-rose-600 hover:!bg-rose-50"
              >
                <UserX className="h-4 w-4" /> Deactivate account
              </SecondaryButton>
            ) : (
              <SecondaryButton onClick={handleActivate} disabled={statusSaving}>
                <UserCheck className="h-4 w-4" /> Activate account
              </SecondaryButton>
            )}
            <SecondaryButton onClick={() => router.push("/admin/users")}>
              <ArrowLeft className="h-4 w-4" /> Back to users
            </SecondaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <div className="admin-panel p-6">
          <h3 className="mb-4 text-base font-semibold text-ink">Personal information</h3>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-white">
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
            <div>
              <p className="font-medium text-ink">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-ink-muted">{user.email}</p>
              <p className="text-sm text-ink-muted">{user.phone || "No phone on file"}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-soft">Country</dt>
              <dd className="text-ink">{user.country || "—"}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Joined</dt>
              <dd className="text-ink">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-soft">Bio</dt>
              <dd className="text-ink">{user.bio || "—"}</dd>
            </div>
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
            <Field label="Role">
              <Select value={user.role} onChange={(e) => handleFieldUpdate("role", e.target.value)}>
                <option value="TRAVELER">Traveler</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
            <Field label="Account status">
              <Select value={user.status} onChange={(e) => handleFieldUpdate("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </Select>
            </Field>
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Travel documents</h3>
            <Badge
              tone={
                user.verificationStatus === "verified"
                  ? "success"
                  : user.verificationStatus === "pending"
                  ? "warning"
                  : user.verificationStatus === "rejected"
                  ? "danger"
                  : "neutral"
              }
            >
              {user.verificationStatus}
            </Badge>
          </div>

          {user.passport ? (
            <>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-soft">Full name on passport</dt>
                  <dd className="text-ink">{user.passport.fullName}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Nationality</dt>
                  <dd className="text-ink">{user.passport.nationality}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Passport number</dt>
                  <dd className="text-ink">{user.passport.passportNumber}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Expiry</dt>
                  <dd className="text-ink">{new Date(user.passport.passportExpiry).toLocaleDateString()}</dd>
                </div>
              </dl>

              <div className="relative mt-4 aspect-[3/2] w-full overflow-hidden rounded-xl border border-border bg-surface-muted">
                <Image src={user.passport.passportImage} alt="Passport" fill className="object-contain" unoptimized />
              </div>

              {user.verificationNote ? (
                <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-muted">
                  Note: {user.verificationNote}
                </p>
              ) : null}

              {user.verificationStatus === "pending" || user.verificationStatus === "unverified" ? (
                <div className="mt-5 flex gap-3">
                  <PrimaryButton className="flex-1" onClick={() => setVerifyModal("approve")}>
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </PrimaryButton>
                  <SecondaryButton className="flex-1" onClick={() => setVerifyModal("reject")}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </SecondaryButton>
                </div>
              ) : (
                <div className="mt-5 flex gap-3">
                  <SecondaryButton className="flex-1" onClick={() => setVerifyModal(user.verificationStatus === "verified" ? "reject" : "approve")}>
                    {user.verificationStatus === "verified" ? (
                      <>
                        <ShieldX className="h-4 w-4" /> Revoke verification
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Re-approve
                      </>
                    )}
                  </SecondaryButton>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted px-6 py-10 text-center">
              <Ban className="h-6 w-6 text-ink-soft" />
              <p className="text-sm text-ink-muted">This user hasn&apos;t submitted passport details yet.</p>
              {user.verificationStatus !== "verified" ? (
                <SecondaryButton onClick={() => setManualVerifyConfirmOpen(true)}>
                  <ShieldCheck className="h-4 w-4" /> Verify manually
                </SecondaryButton>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(verifyModal)}
        onClose={() => setVerifyModal(null)}
        title={verifyModal === "approve" ? "Approve passport" : "Reject passport"}
        width="md"
      >
        <Field label="Note (optional)" hint="Shown to the traveler if relevant">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for this decision…" />
        </Field>
        <div className="mt-5 flex justify-end gap-3">
          <SecondaryButton onClick={() => setVerifyModal(null)}>Cancel</SecondaryButton>
          <PrimaryButton
            disabled={submitting}
            onClick={() => verifyModal && handleVerify(verifyModal)}
            className={verifyModal === "reject" ? "!bg-rose-600 hover:!bg-rose-700" : ""}
          >
            {submitting ? "Saving…" : verifyModal === "approve" ? "Approve" : "Reject"}
          </PrimaryButton>
        </div>
      </Modal>

      <ConfirmDialog
        open={manualVerifyConfirmOpen}
        title="Verify manually"
        description={`${user.firstName} ${user.lastName} hasn't submitted a passport. Marking them verified skips that check — only do this if you've confirmed their identity another way.`}
        confirmLabel="Verify"
        loading={manualVerifySaving}
        onConfirm={handleManualVerify}
        onClose={() => setManualVerifyConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deactivateConfirmOpen}
        title="Deactivate account"
        description={`${user.firstName} ${user.lastName} won't be able to sign in or make bookings until reactivated. You can turn this back on anytime.`}
        confirmLabel="Deactivate"
        loading={statusSaving}
        onConfirm={handleDeactivate}
        onClose={() => setDeactivateConfirmOpen(false)}
      />
    </div>
  );
}
