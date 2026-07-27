"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Globe2, Lock, Mail, Phone, User } from "lucide-react";
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

const DEFAULT_DIAL_CODE = "+1";

function splitPhoneParts(value?: string | null) {
  const raw = (value || "").trim();
  const matchedDial = COUNTRY_DIAL_OPTIONS.find(
    (option) => raw === option.code || raw.startsWith(`${option.code} `)
  );

  if (!raw) {
    return { dialCode: DEFAULT_DIAL_CODE, localNumber: "" };
  }

  if (matchedDial) {
    return {
      dialCode: matchedDial.code,
      localNumber: raw.slice(matchedDial.code.length).trim(),
    };
  }

  if (raw.startsWith("+")) {
    const [dialCode, ...rest] = raw.split(/\s+/);
    return {
      dialCode: dialCode || DEFAULT_DIAL_CODE,
      localNumber: rest.join(" ").trim(),
    };
  }

  return { dialCode: DEFAULT_DIAL_CODE, localNumber: raw };
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
  const [phoneDialCode, setPhoneDialCode] = useState(initialPhone.dialCode);
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
              const currentPhone = splitPhoneParts(data.phone);
              setPhoneDialCode(currentPhone.dialCode);
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
              const localNumber = values.phone.trim();
              const phone = localNumber
                ? `${phoneDialCode} ${localNumber}`.trim()
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
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3">
              <Select
                label="Code"
                value={phoneDialCode}
                onChange={(e) => setPhoneDialCode(e.target.value)}
              >
                {COUNTRY_DIAL_OPTIONS.map((option) => (
                  <option key={`${option.country}-${option.code}`} value={option.code}>
                    {option.code}
                  </option>
                ))}
              </Select>
              <Input
                label="Phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                placeholder="Enter your phone number"
                leftIcon={<Phone size={18} strokeWidth={1.75} />}
                error={step2.formState.errors.phone?.message}
                {...step2.register("phone")}
              />
            </div>

            <Select
              label="Country"
              leftIcon={<Globe2 size={18} strokeWidth={1.75} />}
              error={step2.formState.errors.country?.message}
              defaultValue=""
              {...step2.register("country")}
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
                  const currentPhone = splitPhoneParts(data.phone);
                  setPhoneDialCode(currentPhone.dialCode);
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
                const currentPhone = splitPhoneParts(data.phone);
                setPhoneDialCode(currentPhone.dialCode);
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
