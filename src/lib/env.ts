/**
 * Fail fast on missing / weak production configuration.
 * Import from instrumentation or a server entry once at boot.
 */
export function validateEnv() {
  const required = ["MONGODB_URI", "AUTH_SECRET"] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (process.env.NODE_ENV === "production") {
    const secret = process.env.AUTH_SECRET || "";
    if (secret.length < 32 || /change.?me|secret|placeholder/i.test(secret)) {
      throw new Error(
        "AUTH_SECRET must be a strong random string (≥32 chars) in production"
      );
    }

    if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
      console.warn(
        "[env] AUTH_URL / NEXTAUTH_URL not set — OAuth and absolute callbacks may break"
      );
    }
  }
}
