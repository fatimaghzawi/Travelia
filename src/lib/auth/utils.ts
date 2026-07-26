/** Normalize email for consistent lookups and comparisons. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Redact email for logs: `f***@gmail.com` */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "[invalid-email]";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
