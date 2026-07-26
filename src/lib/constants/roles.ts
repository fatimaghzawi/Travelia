export const ROLES = {
  ADMIN: "ADMIN",
  TRAVELER: "TRAVELER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const AUTH_PROVIDERS = {
  CREDENTIALS: "credentials",
  GOOGLE: "google",
  GITHUB: "github",
  APPLE: "apple",
} as const;

export type AuthProvider =
  (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
