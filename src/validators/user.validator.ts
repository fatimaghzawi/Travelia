import { z } from "zod";
import { dateSchema, imageUploadSchema, objectIdSchema } from "./common";
import { ROLES } from "@/lib/constants/roles";

export const userRoleSchema = z.enum([ROLES.TRAVELER, ROLES.ADMIN]);
export const userStatusSchema = z.enum(["active", "inactive", "blocked"]);
export const verificationStatusSchema = z.enum([
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const passportSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    nationality: z.string().trim().min(2).max(80),
    passportNumber: z
      .string()
      .trim()
      .min(5)
      .max(30)
      .regex(/^[A-Za-z0-9]+$/, "Passport number must be alphanumeric"),
    passportExpiry: dateSchema.refine((d) => d > new Date(), {
      message: "Passport must not be expired",
    }),
    passportImage: imageUploadSchema,
  })
  .strict();

/** @deprecated Prefer registerSchema from auth.validator — kept for admin create flows */
export const registerUserSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().trim().min(7).max(20).optional(),
  country: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(300).optional(),
});

export const loginUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = registerUserSchema.extend({
  image: z.string().trim().url().optional().nullable(),
  role: userRoleSchema.default(ROLES.TRAVELER),
  status: userStatusSchema.default("active"),
  passport: passportSchema.optional().nullable(),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(2).max(50).optional(),
    lastName: z.string().trim().min(2).max(50).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().min(7).max(20).optional().nullable(),
    image: z.string().trim().url().optional().nullable(),
    country: z.string().trim().max(80).optional().nullable(),
    bio: z.string().trim().max(300).optional().nullable(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    passport: passportSchema.optional().nullable(),
  })
  .strict();

/** Traveler self-service profile update (no role/status). */
export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(2).max(50).optional(),
    lastName: z.string().trim().min(2).max(50).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: z.string().trim().min(7).max(20).optional().nullable(),
    image: imageUploadSchema.optional().nullable(),
    country: z.string().trim().max(80).optional().nullable(),
    bio: z.string().trim().max(300).optional().nullable(),
  })
  .strict();

export const updatePassportSchema = passportSchema;

export const adminVerifyUserSchema = z
  .object({
    userId: objectIdSchema,
    action: z.enum(["approve", "reject"]),
    note: z.string().trim().max(500).optional().nullable(),
    force: z.boolean().optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PassportInput = z.infer<typeof passportSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AdminVerifyUserInput = z.infer<typeof adminVerifyUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
