import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/** Cryptographically secure raw token (sent in email / URL). */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** One-way hash for storing tokens at rest (SHA-256). */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
