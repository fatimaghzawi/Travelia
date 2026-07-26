"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Lock,
  Shield,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import type { ProfileDto } from "@/lib/profile/serialize";
import type { VerificationStatus } from "@/models/user.model";

const BIO_MAX = 300;

const COUNTRIES = [
  "United States of America",
  "United Kingdom",
  "Canada",
  "France",
  "Germany",
  "Lebanon",
  "United Arab Emirates",
  "Australia",
  "Italy",
  "Spain",
  "Japan",
  "Indonesia",
  "Switzerland",
  "Greece",
  "Other",
] as const;

function ProfileCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-[#d1e8ea] bg-white shadow-[0_8px_28px_rgba(1,42,62,0.06)] sm:rounded-2xl ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon: typeof UserRound;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-[#eef4f5] pb-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:pb-5">
      <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4FAFB] text-[#127E83] ring-1 ring-[#d1e8ea] sm:h-10 sm:w-10">
          <Icon size={17} strokeWidth={2} className="sm:hidden" />
          <Icon size={18} strokeWidth={2} className="hidden sm:block" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#012A3E] sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#67717A] sm:text-sm">
            {description}
          </p>
        </div>
      </div>
      {action ? (
        <div className="shrink-0 self-start pl-[2.625rem] sm:pl-0">{action}</div>
      ) : null}
    </div>
  );
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "T";
}

function formatExpiry(isoDate: string) {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function VerificationBadge({
  status,
  tone = "light",
}: {
  status: VerificationStatus;
  tone?: "light" | "dark";
}) {
  if (status === "verified") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#ecfdf5] px-3 py-1.5 text-xs font-semibold text-[#047857] ring-1 ring-[#a7f3d0]">
        <CheckCircle2 size={14} strokeWidth={2.25} />
        Verified
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fef2f2] px-3 py-1.5 text-xs font-semibold text-[#b91c1c] ring-1 ring-[#fecaca]">
        <XCircle size={14} strokeWidth={2.25} />
        Rejected
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F4FAFB] px-3 py-1.5 text-xs font-semibold text-[#127E83] ring-1 ring-[#d1e8ea]">
        <Clock size={14} strokeWidth={2.25} />
        Pending verification
      </span>
    );
  }
  if (tone === "dark") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/20">
        Not submitted
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F4FAFB] px-3 py-1.5 text-xs font-semibold text-[#67717A] ring-1 ring-[#d1e8ea]">
      Not submitted
    </span>
  );
}

function PassportImageUpload({
  image,
  onPick,
  disabled,
}: {
  image: string | null;
  onPick: () => void;
  disabled?: boolean;
}) {
  const isPdf = Boolean(image?.toLowerCase().endsWith(".pdf"));

  return (
    <div>
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="group flex min-h-[11rem] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d1e8ea] bg-gradient-to-b from-[#F4FAFB] to-white transition hover:border-[#127E83]/45 hover:shadow-[0_8px_24px_rgba(18,126,131,0.08)] disabled:opacity-60 sm:min-h-0 sm:rounded-2xl"
      >
        {image && !isPdf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="Uploaded passport"
            className="aspect-[1.55/1] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[1.55/1] w-full flex-col items-center justify-center gap-2.5 px-4 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#127E83] shadow-sm ring-1 ring-[#d1e8ea] transition group-hover:scale-105">
              <Upload size={20} strokeWidth={2} />
            </span>
            <p className="text-sm font-semibold text-[#012A3E]">
              {isPdf
                ? "PDF selected — click to replace"
                : "Click to upload passport image"}
            </p>
            <p className="text-xs text-[#67717A]">
              JPG, PNG, WebP or PDF · up to 5MB
            </p>
          </div>
        )}
      </button>
      {image ? (
        <p className="mt-2 text-xs text-[#67717A]">
          {isPdf ? "Passport PDF ready." : "Passport image ready."} Click the
          area above to replace it.
        </p>
      ) : null}
    </div>
  );
}

function DetailRows({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="overflow-hidden rounded-xl border border-[#eef4f5] bg-[#F4FAFB]/50">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-0.5 border-b border-[#eef4f5] px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
        >
          <dt className="text-xs text-[#67717A] sm:text-sm">{row.label}</dt>
          <dd className="break-words text-sm font-semibold text-[#012A3E] sm:max-w-[60%] sm:text-right">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type ProfilePageUiProps = {
  initialProfile: ProfileDto;
};

export function ProfilePageUi({ initialProfile }: ProfilePageUiProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [pending, startTransition] = useTransition();

  const [firstName, setFirstName] = useState(initialProfile.firstName);
  const [lastName, setLastName] = useState(initialProfile.lastName);
  const [email, setEmail] = useState(initialProfile.email);
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [country, setCountry] = useState(initialProfile.country ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [personalMsg, setPersonalMsg] = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const [passportFullName, setPassportFullName] = useState(
    initialProfile.passport?.fullName ?? ""
  );
  const [nationality, setNationality] = useState(
    initialProfile.passport?.nationality ?? ""
  );
  const [passportNumber, setPassportNumber] = useState(
    initialProfile.passport?.passportNumber ?? ""
  );
  const [passportExpiry, setPassportExpiry] = useState(
    initialProfile.passport?.passportExpiry ?? ""
  );
  const [passportImage, setPassportImage] = useState(
    initialProfile.passport?.passportImage ?? ""
  );
  const [passportMsg, setPassportMsg] = useState<string | null>(null);
  const [passportError, setPassportError] = useState<string | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const photoInputId = useId();
  const passportInputId = useId();
  const photoRef = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLInputElement>(null);

  const countryOptions =
    country && !COUNTRIES.includes(country as (typeof COUNTRIES)[number])
      ? [country, ...COUNTRIES]
      : [...COUNTRIES];

  const personalDirty =
    firstName.trim() !== profile.firstName ||
    lastName.trim() !== profile.lastName ||
    email.trim().toLowerCase() !== profile.email ||
    (phone.trim() || null) !== (profile.phone ?? null) ||
    (country.trim() || null) !== (profile.country ?? null) ||
    (bio.trim() || null) !== (profile.bio ?? null);

  const passportBaseline = {
    fullName: profile.passport?.fullName ?? "",
    nationality: profile.passport?.nationality ?? "",
    passportNumber: profile.passport?.passportNumber ?? "",
    passportExpiry: profile.passport?.passportExpiry ?? "",
    passportImage: profile.passport?.passportImage ?? "",
  };

  const passportDirty =
    passportFullName.trim() !== passportBaseline.fullName ||
    nationality.trim() !== passportBaseline.nationality ||
    passportNumber.trim().toUpperCase() !==
      passportBaseline.passportNumber.toUpperCase() ||
    passportExpiry !== passportBaseline.passportExpiry ||
    passportImage !== passportBaseline.passportImage;

  const passwordDirty =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  async function uploadFile(file: File, kind: "avatar" | "passport") {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    const res = await fetch("/api/profile/upload", {
      method: "POST",
      body,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Upload failed");
    }
    return json.data as { url: string; profile?: ProfileDto };
  }

  async function onAvatarChange(file: File | null) {
    if (!file) return;
    setPersonalError(null);
    try {
      const data = await uploadFile(file, "avatar");
      if (data.profile) {
        setProfile(data.profile);
        // Keep passport form state in sync — never copy avatar into passport.
        if (data.profile.passport?.passportImage) {
          setPassportImage(data.profile.passport.passportImage);
        }
      }
      setPersonalMsg("Profile photo updated");
      startTransition(() => router.refresh());
    } catch (error) {
      setPersonalError(
        error instanceof Error ? error.message : "Could not upload photo"
      );
    }
  }

  async function onPassportFileChange(file: File | null) {
    if (!file) return;
    setPassportError(null);
    try {
      const data = await uploadFile(file, "passport");
      // Passport uploads only return a URL — never touch profile.image.
      setPassportImage(data.url);
      setPassportMsg("Passport image ready — submit to send for verification");
    } catch (error) {
      setPassportError(
        error instanceof Error ? error.message : "Could not upload passport"
      );
    }
  }

  async function savePersonal(event: FormEvent) {
    event.preventDefault();
    setPersonalError(null);
    setPersonalMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone.trim() || null,
          country: country.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPersonalError(json.message || "Could not save profile");
        return;
      }
      setProfile(json.data);
      setFirstName(json.data.firstName);
      setLastName(json.data.lastName);
      setEmail(json.data.email);
      setPhone(json.data.phone ?? "");
      setCountry(json.data.country ?? "");
      setBio(json.data.bio ?? "");
      setPersonalMsg("Profile saved");
      startTransition(() => router.refresh());
    } catch {
      setPersonalError("Could not save profile");
    }
  }

  async function submitPassport(event: FormEvent) {
    event.preventDefault();
    setPassportError(null);
    setPassportMsg(null);

    if (!passportImage) {
      setPassportError("Upload a passport image first");
      return;
    }

    try {
      const res = await fetch("/api/profile/passport", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: passportFullName,
          nationality,
          passportNumber,
          passportExpiry,
          passportImage,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPassportError(json.message || "Could not submit passport");
        return;
      }
      setProfile(json.data);
      setPassportFullName(json.data.passport?.fullName ?? "");
      setNationality(json.data.passport?.nationality ?? "");
      setPassportNumber(json.data.passport?.passportNumber ?? "");
      setPassportExpiry(json.data.passport?.passportExpiry ?? "");
      setPassportImage(json.data.passport?.passportImage ?? "");
      setPassportMsg("Passport submitted for admin verification");
      startTransition(() => router.refresh());
    } catch {
      setPassportError("Could not submit passport");
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setPasswordError(json.message || "Could not change password");
        return;
      }
      setPasswordMsg("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordOpen(false), 800);
    } catch {
      setPasswordError("Could not change password");
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="relative overflow-hidden rounded-xl border border-[#d1e8ea] bg-[#012A3E] px-4 py-5 text-white shadow-[0_12px_32px_rgba(1,42,62,0.18)] sm:rounded-2xl sm:px-8 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 80% 20%, rgba(18,126,131,0.55), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(81,165,214,0.25), transparent 45%)",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              {profile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.image}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover ring-4 ring-white/20 sm:h-24 sm:w-24"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#127E83] to-[#0f6b6f] text-xl font-semibold ring-4 ring-white/20 sm:h-24 sm:w-24 sm:text-2xl">
                  {initials(firstName, lastName)}
                </div>
              )}
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={pending}
                className="absolute -bottom-0.5 -right-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#127E83] shadow-md ring-1 ring-[#d1e8ea] transition hover:bg-[#F4FAFB] sm:h-9 sm:w-9"
                aria-label="Change profile photo"
              >
                <Camera size={16} strokeWidth={2} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9BE7E0] sm:text-xs">
                Your profile
              </p>
              <h1 className="mt-0.5 break-words font-display text-2xl font-semibold leading-tight tracking-tight sm:mt-1 sm:text-4xl">
                {firstName} {lastName}
              </h1>
              <p className="mt-1 break-all text-xs text-white/75 sm:truncate sm:text-sm">
                {email}
              </p>
              {country ? (
                <p className="mt-0.5 text-xs text-white/60 sm:mt-1 sm:text-sm">
                  {country}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-[4.25rem] sm:pl-0">
            <VerificationBadge
              status={profile.verificationStatus}
              tone="dark"
            />
            {profile.isVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#B8F5EF] ring-1 ring-white/15">
                <Shield size={13} strokeWidth={2.25} />
                Booking ready
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
        <ProfileCard>
          <div className="p-4 sm:p-6 lg:p-7">
            <SectionHeader
              icon={UserRound}
              title="Personal information"
              description="Manage your personal details and bio."
            />

            <form className="flex flex-col gap-3.5 sm:gap-4" onSubmit={savePersonal}>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                <Input
                  label="First name"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last name"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
              <Input
                label="Email address"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                <Input
                  label="Phone number"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="+1 202-555-0143"
                />
                <Select
                  label="Country"
                  name="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">Select country</option>
                  {countryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rounded-xl border border-[#eef4f5] bg-[#F4FAFB]/70 p-3.5 sm:p-4">
                <p className={fieldLabel}>Profile photo</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3">
                    {profile.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.image}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-white sm:h-16 sm:w-16"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#012A3E] text-base font-semibold text-white sm:h-16 sm:w-16 sm:text-lg">
                        {initials(firstName, lastName)}
                      </div>
                    )}
                    <p className="text-xs text-[#67717A] sm:hidden">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="hidden text-sm text-[#67717A] sm:block">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-0 w-full gap-2 sm:mt-2 sm:w-auto"
                      disabled={pending}
                      onClick={() => photoRef.current?.click()}
                    >
                      <Camera size={15} strokeWidth={2} />
                      Change photo
                    </Button>
                  </div>
                </div>
                <input
                  ref={photoRef}
                  id={photoInputId}
                  name="avatarFile"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    onAvatarChange(file);
                  }}
                />
              </div>

              <Textarea
                label="Bio"
                name="bio"
                rows={4}
                maxLength={BIO_MAX}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                counter={{ current: bio.length, max: BIO_MAX }}
              />

              {personalError ? (
                <p className="text-sm text-red-600" role="alert">
                  {personalError}
                </p>
              ) : null}
              {personalMsg ? (
                <p className="text-sm text-[#127E83]" role="status">
                  {personalMsg}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-[#eef4f5] pt-4 sm:flex-row sm:flex-wrap">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={pending || !personalDirty}
                >
                  Save changes
                </Button>
                {profile.hasPassword ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full gap-2 sm:w-auto"
                    onClick={() => {
                      setPasswordOpen((open) => !open);
                      setPasswordError(null);
                      setPasswordMsg(null);
                    }}
                  >
                    <Lock size={16} strokeWidth={2} />
                    Change password
                  </Button>
                ) : null}
              </div>
            </form>

            {passwordOpen && profile.hasPassword ? (
              <form
                onSubmit={changePassword}
                className="mt-4 space-y-3 rounded-xl border border-[#d1e8ea] bg-[#F4FAFB] p-3.5 sm:mt-5 sm:rounded-2xl sm:p-5"
              >
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#127E83]" />
                  <p className="text-sm font-semibold text-[#012A3E]">
                    Change password
                  </p>
                </div>
                <Input
                  label="Current password"
                  type="password"
                  name="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Input
                  label="New password"
                  type="password"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {passwordError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {passwordError}
                  </p>
                ) : null}
                {passwordMsg ? (
                  <p className="text-sm text-[#127E83]" role="status">
                    {passwordMsg}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={pending || !passwordDirty}
                >
                  Update password
                </Button>
              </form>
            ) : null}
          </div>
        </ProfileCard>

        <ProfileCard>
          <div className="p-4 sm:p-6 lg:p-7">
            <SectionHeader
              icon={FileText}
              title="Travel documents"
              description="Upload your passport and track verification status."
              action={<VerificationBadge status={profile.verificationStatus} />}
            />

            {profile.verificationStatus === "verified" && profile.passport ? (
              <div className="space-y-4 sm:space-y-5">
                <DetailRows
                  rows={[
                    {
                      label: "Full name as on passport",
                      value: profile.passport.fullName,
                    },
                    {
                      label: "Nationality",
                      value: profile.passport.nationality,
                    },
                    {
                      label: "Passport number",
                      value: profile.passport.passportNumber,
                    },
                    {
                      label: "Passport expiry",
                      value: formatExpiry(profile.passport.passportExpiry),
                    },
                  ]}
                />

                <div>
                  <h3 className="text-sm font-semibold text-[#012A3E]">
                    Passport image
                  </h3>
                  <div className="mt-3 overflow-hidden rounded-xl border border-[#d1e8ea] bg-[#F4FAFB] shadow-sm sm:rounded-2xl">
                    {profile.passport.passportImage
                      .toLowerCase()
                      .endsWith(".pdf") ? (
                      <div className="flex aspect-[1.55/1] min-h-[140px] items-center justify-center px-4 text-sm text-[#67717A]">
                        Passport PDF on file
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.passport.passportImage}
                        alt="Verified passport"
                        className="aspect-[1.55/1] w-full object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-3 sm:px-3.5">
                  <CheckCircle2
                    size={18}
                    strokeWidth={2.25}
                    className="mt-0.5 shrink-0 text-[#047857]"
                  />
                  <p className="text-sm leading-relaxed text-[#065f46]">
                    Your passport is verified. You can book destinations and
                    activities.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {profile.passport &&
                profile.verificationStatus !== "unverified" ? (
                  <div className="mb-4 sm:mb-5">
                    <DetailRows
                      rows={[
                        {
                          label: "Full name as on passport",
                          value: profile.passport.fullName,
                        },
                        {
                          label: "Nationality",
                          value: profile.passport.nationality,
                        },
                        {
                          label: "Passport number",
                          value: profile.passport.passportNumber,
                        },
                        {
                          label: "Passport expiry",
                          value: formatExpiry(profile.passport.passportExpiry),
                        },
                      ]}
                    />
                  </div>
                ) : null}

                {profile.verificationNote &&
                profile.verificationStatus === "rejected" ? (
                  <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800 sm:px-3.5">
                    {profile.verificationNote}
                  </p>
                ) : null}

                <form
                  className="flex flex-col gap-3.5 sm:gap-4"
                  onSubmit={submitPassport}
                >
                  <Input
                    label="Full name as on passport"
                    name="passportFullName"
                    value={passportFullName}
                    onChange={(e) => setPassportFullName(e.target.value)}
                    required
                  />
                  <Input
                    label="Nationality"
                    name="nationality"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                    <Input
                      label="Passport number"
                      name="passportNumber"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      required
                    />
                    <Input
                      label="Passport expiry"
                      name="passportExpiry"
                      type="date"
                      value={passportExpiry}
                      onChange={(e) => setPassportExpiry(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#012A3E]">
                      Upload passport image
                    </h3>
                    <p className="mt-1 text-xs text-[#67717A] sm:text-sm">
                      Upload a clear image of your passport (JPG, PNG, PDF up to
                      5MB).
                    </p>

                    <div className="mt-3">
                      <PassportImageUpload
                        image={passportImage || null}
                        onPick={() => passportRef.current?.click()}
                        disabled={pending}
                      />
                    </div>

                    <input
                      ref={passportRef}
                      id={passportInputId}
                      name="passportFile"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="sr-only"
                      tabIndex={-1}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        onPassportFileChange(file);
                      }}
                    />
                  </div>

                  <div className="flex gap-3 rounded-xl border border-[#d1e8ea] bg-[#F4FAFB] px-3 py-3 sm:px-3.5">
                    <Info
                      size={18}
                      strokeWidth={2.25}
                      className="mt-0.5 shrink-0 text-[#127E83]"
                    />
                    <p className="text-sm leading-relaxed text-[#475569]">
                      Admin verifies your passport once. After approval you can
                      book destinations and activities.
                    </p>
                  </div>

                  {passportError ? (
                    <p className="text-sm text-red-600" role="alert">
                      {passportError}
                    </p>
                  ) : null}
                  {passportMsg ? (
                    <p className="text-sm text-[#127E83]" role="status">
                      {passportMsg}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pending || !passportDirty}
                  >
                    {profile.verificationStatus === "rejected"
                      ? "Resubmit for verification"
                      : "Submit for verification"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}

const fieldLabel = "text-sm font-medium text-[#012A3E]";
