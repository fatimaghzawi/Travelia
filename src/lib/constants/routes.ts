/**
 * Central route maps for middleware and navigation.
 * Keep public / auth / role-protected paths in one place.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/destinations",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/email-verified",
  "/access-denied",
] as const;

export const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

export const TRAVELER_PREFIX = "/dashboard";
export const ADMIN_PREFIX = "/admin";

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number])) {
    return true;
  }
  if (pathname.startsWith("/destinations/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  return false;
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isTravelerRoute(pathname: string): boolean {
  return pathname === TRAVELER_PREFIX || pathname.startsWith(`${TRAVELER_PREFIX}/`);
}

export function isAdminRoute(pathname: string): boolean {
  return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}
