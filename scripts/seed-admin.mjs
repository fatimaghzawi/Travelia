/**
 * Create or promote a verified ADMIN user.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *   node scripts/seed-admin.mjs admin@travelia.local "YourStrongPass1!"
 *
 * Requires MONGODB_URI in .env.local or .env
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const email = (process.argv[2] || "admin@travelia.local").toLowerCase().trim();
const password = process.argv[3] || "Admin123!";
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Missing MONGODB_URI. Set it in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const users = db.collection("users");
  const hashed = await bcrypt.hash(password, 12);
  const now = new Date();

  const existing = await users.findOne({ email });
  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          password: hashed,
          role: "ADMIN",
          emailVerified: true,
          status: "active",
          provider: "credentials",
          updatedAt: now,
        },
      }
    );
    console.log(`Updated existing user to verified ADMIN: ${email}`);
  } else {
    await users.insertOne({
      firstName: "Travelia",
      lastName: "Admin",
      email,
      password: hashed,
      role: "ADMIN",
      emailVerified: true,
      provider: "credentials",
      status: "active",
      isVerified: false,
      verificationStatus: "unverified",
      image: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created verified ADMIN: ${email}`);
  }

  console.log(`Password: ${password}`);
  console.log("Sign in at /login — you will be redirected to /admin");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.close();
}
