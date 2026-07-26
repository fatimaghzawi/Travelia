import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    remember: z.boolean().optional(),
  })
  .strict();

/** Auth.js may include extra fields (e.g. csrf) — do not use .strict() here. */
export const credentialsLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerStep1Schema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const registerStep2Schema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required").max(50),
    lastName: z.string().trim().min(2, "Last name is required").max(50),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v.length === 0 || v.length >= 7, {
        message: "Enter a valid phone number",
      })
      .optional(),
    country: z.string().trim().min(2, "Select your country"),
  })
  .strict();

export const registerStep3Schema = z
  .object({
    bio: z.string().trim().max(120, "Bio must be 120 characters or less").optional(),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, {
        message: "You must accept the Terms of Service and Privacy Policy",
      }),
  })
  .strict();

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().min(2).max(50),
    phone: z.string().trim().max(20).optional().nullable(),
    country: z.string().trim().max(80).optional().nullable(),
    bio: z.string().trim().max(120).optional().nullable(),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, {
        message: "You must accept the Terms of Service and Privacy Policy",
      }),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Client form — token comes from URL, not the form fields. */
export const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, "Verification token is required"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
export type RegisterStep2Input = z.infer<typeof registerStep2Schema>;
export type RegisterStep3Input = z.infer<typeof registerStep3Schema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
