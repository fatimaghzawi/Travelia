/**
 * CORS helpers — implemented in Step 6.
 */
export function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}
