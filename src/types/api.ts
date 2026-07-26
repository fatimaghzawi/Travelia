import type { Role } from "@/lib/constants/roles";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  message: string;
  code?: string;
  errors?: unknown[];
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type UserRole = Role;
