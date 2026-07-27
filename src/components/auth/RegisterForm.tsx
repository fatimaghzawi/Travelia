"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronDown, Globe2, Lock, Mail, User } from "lucide-react";
import {
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  type RegisterStep1Input,
  type RegisterStep2Input,
  type RegisterStep3Input,
} from "@/validators/auth.validator";
import {
  COUNTRY_DIAL_OPTIONS,
  COUNTRY_OPTIONS,
  dialCodeForCountry,
} from "@/lib/constants/countries";
import {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
} from "@/lib/constants/legal-content";
import {
  Alert,
  Button,
  Input,
  PasswordInput,
  Select,
  Textarea,
} from "@/components/ui";
import {
  fieldErrorClass,
  fieldLabelClass,
} from "@/components/ui/field";
import { SplitAuthLayout } from "@/components/auth/AuthShell";
import { AuthFormHeader } from "@/components/auth/AuthFormHeader";
import { AuthBackLink } from "@/components/auth/AuthBackLink";
import { AuthStepper } from "@/components/auth/AuthStepper";
import { LegalPanel } from "@/components/legal/LegalPanel";

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Preferences" },
] as const;

type WizardData = RegisterStep1Input &
  RegisterStep2Input &
  RegisterStep3Input;

const DEFAULT_DIAL = COUNTRY_DIAL_OPTIONS[0];

function findDialOption(dialCode: string, preferredCountry?: string | null) {
  if (preferredCountry) {
    const byCountry = COUNTRY_DIAL_OPTIONS.find(
      (option) => option.country === preferredCountry
    );
    if (byCountry) return byCountry;
  }

  const matches = COUNTRY_DIAL_OPTIONS.filter(
    (option) => option.code === dialCode
  );
  return matches[0] ?? DEFAULT_DIAL;
}

function splitPhoneParts(value?: string | null, preferredCountry?: string | null) {
  const raw = (value || "").trim();

  if (!raw) {
    return {
      dial: preferredCountry
        ? findDialOption(dialCodeForCountry(preferredCountry), preferredCountry)
        : DEFAULT_DIAL,
      localNumber: "",
    };
  }

  const matchedDial = [...COUNTRY_DIAL_OPTIONS]
    .sort((a, b) => b.code.length - a.code.length)
    .find(
      (option) => raw === option.code || raw.startsWith(`${option.code} `)
    );

  if (matchedDial) {
    const dial =
      preferredCountry &&
      COUNTRY_DIAL_OPTIONS.some(
        (option) =>
          option.country === preferredCountry &&
          option.code === matchedDial.code
      )
        ? findDialOption(matchedDial.code, preferredCountry)
        : matchedDial;

    return {
      dial,
      localNumber: raw.slice(matchedDial.code.length).trim(),
    };
  }

  if (raw.startsWith("+")) {
    const [dialCode, ...rest] = raw.split(/\s+/);
    return {
      dial: findDialOption(dialCode || DEFAULT_DIAL.code, preferredCountry),
      localNumber: rest.join(" ").trim(),
    };
  }

  return {
    dial: preferredCountry
      ? findDialOption(dialCodeForCountry(preferredCountry), preferredCountry)
      : DEFAULT_DIAL,
    localNumber: raw,
  };
}

function StepHeader({
  step,
  title,
  subtitle,
  hint,
}: {
  step: number;
  title: string;
  subtitle: string;
  hint?: string;
}) {
  return (
    <AuthFormHeader
      title={title}
      subtitle={subtitle}
      belowLogo={
        <AuthStepper steps={[...STEPS]} current={step} hint={hint} />
      }
    />
  );
}

type LegalView = "terms" | "privacy" | null;

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<WizardData>>({});
  const initialPhone = splitPhoneParts();
  const [phoneDialIso, setPhoneDialIso] = useState<string>(initialPhone.dial.iso);
  const phoneDial =
    COUNTRY_DIAL_OPTIONS.find((option) => option.iso === phoneDialIso) ??
    DEFAULT_DIAL;
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [legalView, setLegalView] = useState<LegalView>(null);

  const step1 = useForm<RegisterStep1Input>({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const step2 = useForm<RegisterStep2Input>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: initialPhone.localNumber,
      country: "",
    },
  });

  const step3 = useForm<RegisterStep3Input>({
    resolver: zodResolver(registerStep3Schema),
    defaultValues: { bio: "", acceptTerms: false },
  });

  const bioValue = step3.watch("bio") ?? "";

  async function finish(values: RegisterStep3Input) {
    setServerError(null);
    setSuccess(null);
    setSubmitting(true);

    const payload = {
      email: data.email!,
      password: data.password!,
      confirmPassword: data.confirmPassword!,
      firstName: data.firstName!,
      lastName: data.lastName!,
      phone: data.phone || null,
      country: data.country || null,
      bio: values.bio || null,
      acceptTerms: values.acceptTerms,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setServerError(json.message ?? "Registration failed. Please try again.");
        return;
      }
      setSuccess(json.message);
      setTimeout(() => router.push("/login"), 2500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SplitAuthLayout>
      <div className={`relative ${legalView ? "min-h-[28rem]" : ""}`}>
        {legalView === "terms" ? (
          <LegalPanel
            document={TERMS_OF_SERVICE}
            onClose={() => setLegalView(null)}
          />
        ) : null}
        {legalView === "privacy" ? (
          <LegalPanel
            document={PRIVACY_POLICY}
            onClose={() => setLegalView(null)}
          />
        ) : null}

        {step === 1 ? (
        <>
          <StepHeader
            step={1}
            title="Create account"
            subtitle="Step 1 of 3 — Account details"
            hint="Next: Profile info, then Preferences"
          />

          <form
            className="mt-4 flex flex-col gap-3"
            noValidate
            onSubmit={step1.handleSubmit((values) => {
              setData((prev) => ({ ...prev, ...values }));
              const currentPhone = splitPhoneParts(data.phone, data.country);
              setPhoneDialIso(currentPhone.dial.iso);
              step2.reset({
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                phone: currentPhone.localNumber,
                country: data.country || "",
              });
              setStep(2);
            })}
          >
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              leftIcon={<Mail size={18} strokeWidth={1.75} />}
              error={step1.formState.errors.email?.message}
              {...step1.register("email")}
            />
            <PasswordInput
              label="Password"
              autoComplete="new-password"
              placeholder="Create a password"
              leftIcon={<Lock size={18} strokeWidth={1.75} />}
              error={step1.formState.errors.password?.message}
              {...step1.register("password")}
            />
            <PasswordInput
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              leftIcon={<Lock size={18} strokeWidth={1.75} />}
              error={step1.formState.errors.confirmPassword?.message}
              {...step1.register("confirmPassword")}
            />
            <Button type="submit" className="mt-1 w-full">
              Continue
            </Button>
          </form>

          <AuthBackLink>
            Already have an account? Sign in
          </AuthBackLink>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepHeader
            step={2}
            title="Your profile"
            subtitle="Step 2 of 3"
          />

          <form
            className="mt-4 flex flex-col gap-3"
            noValidate
            onSubmit={step2.handleSubmit((values) => {
              const localNumber = (values.phone ?? "").trim();
              const phone = localNumber
                ? `${phoneDial.code} ${localNumber}`.trim()
                : "";
              setData((prev) => ({ ...prev, ...values, phone }));
              setStep(3);
            })}
          >
            <Input
              label="First name"
              autoComplete="given-name"
              placeholder="Enter your first name"
              leftIcon={<User size={18} strokeWidth={1.75} />}
              error={step2.formState.errors.firstName?.message}
              {...step2.register("firstName")}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              placeholder="Enter your last name"
              leftIcon={<User size={18} strokeWidth={1.75} />}
              error={step2.formState.errors.lastName?.message}
              {...step2.register("lastName")}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-phone" className={fieldLabelClass}>
                Phone number
              </label>
              <div
                className={`flex min-h-10 overflow-hidden rounded-lg border bg-white transition focus-within:border-[#127E83] focus-within:ring-2 focus-within:ring-[#127E83]/25 ${
                  step2.formState.errors.phone
                    ? "border-[#E4574A]"
                    : "border-[#CBD2D9]"
                }`}
              >
                <div className="relative w-[7.25rem] shrink-0 border-r border-[#CBD2D9] bg-[#F4F7F9] sm:w-[7.75rem]">
                  <label htmlFor="register-phone-dial" className="sr-only">
                    Country calling code
                  </label>
                  <select
                    id="register-phone-dial"
                    value={phoneDial.iso}
                    onChange={(e) => setPhoneDialIso(e.target.value)}
                    className="h-full min-h-10 w-full appearance-none bg-transparent py-2 pl-3 pr-7 text-sm font-semibold tabular-nums text-[#012A3E] outline-none"
                    aria-label="Country calling code"
                  >
                    {COUNTRY_DIAL_OPTIONS.map((option) => (
                      <option key={option.iso} value={option.iso}>
                        {option.iso} {option.code}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#67717A]">
                    <ChevronDown size={14} />
                  </span>
                </div>
                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="tel"
                  placeholder="Phone number"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-[#002642] outline-none placeholder:text-[#94A3B8]"
                  aria-invalid={!!step2.formState.errors.phone}
                  {...step2.register("phone")}
                />
              </div>
              {step2.formState.errors.phone?.message ? (
                <p className={fieldErrorClass}>
                  {step2.formState.errors.phone.message}
                </p>
              ) : (
                <p className="text-xs text-[#67717A]">
                  {phoneDial.country} · {phoneDial.code}
                </p>
              )}
            </div>

            <Select
              label="Country"
              leftIcon={<Globe2 size={18} strokeWidth={1.75} />}
              error={step2.formState.errors.country?.message}
              defaultValue=""
              {...step2.register("country", {
                onChange: (event) => {
                  const country = event.target.value as string;
                  if (!country) return;
                  const matched = COUNTRY_DIAL_OPTIONS.find(
                    (option) => option.country === country
                  );
                  if (matched) setPhoneDialIso(matched.iso);
                },
              })}
            >
              <option value="" disabled>
                Select your country
              </option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>

            <div className="mt-2 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  const currentPhone = splitPhoneParts(data.phone, data.country);
                  setPhoneDialIso(currentPhone.dial.iso);
                  setStep(1);
                }}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </form>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepHeader
            step={3}
            title="Almost done"
            subtitle="Step 3 of 3 — Confirm & finish"
          />

          <form
            className="mt-4 flex flex-col gap-3"
            noValidate
            onSubmit={step3.handleSubmit(finish)}
          >
            <Textarea
              label="Bio (optional)"
              id="bio"
              rows={2}
              maxLength={120}
              placeholder="Tell us a bit about yourself..."
              counter={{ current: bioValue.length, max: 120 }}
              {...step3.register("bio")}
            />

            <label className="flex items-start gap-2.5 text-sm text-[#012A3E]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[#CBD2D9] text-[#127E83] accent-[#127E83]"
                {...step3.register("acceptTerms")}
              />
              <span>
                I accept the{" "}
                <button
                  type="button"
                  onClick={() => setLegalView("terms")}
                  className="font-medium text-[#3b82f6] hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setLegalView("privacy")}
                  className="font-medium text-[#3b82f6] hover:underline"
                >
                  Privacy Policy
                </button>
                .
              </span>
            </label>
            {step3.formState.errors.acceptTerms ? (
              <p className="text-sm text-[#E4574A]">
                {step3.formState.errors.acceptTerms.message}
              </p>
            ) : null}

            {serverError ? <Alert>{serverError}</Alert> : null}
            {success ? <Alert variant="success">{success}</Alert> : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                const currentPhone = splitPhoneParts(data.phone, data.country);
                setPhoneDialIso(currentPhone.dial.iso);
                step2.reset({
                  firstName: data.firstName || "",
                  lastName: data.lastName || "",
                  phone: currentPhone.localNumber,
                  country: data.country || "",
                });
                setStep(2);
              }}
              disabled={submitting}
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft size={16} />
                Back
              </span>
            </Button>
          </form>
        </>
      ) : null}
      </div>
    </SplitAuthLayout>
  );
}
