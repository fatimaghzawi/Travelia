/**
 * Quick Elastic Email smoke test.
 * Usage: node scripts/test-elastic-email.mjs you@example.com
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const content = readFileSync(path, "utf8");
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    env[line.slice(0, index)] = line.slice(index + 1);
  }

  return env;
}

function parseFromAddress(from) {
  const trimmed = from.trim();
  if (trimmed.includes("<")) return trimmed;

  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (!emailMatch) return trimmed;

  const email = emailMatch[0];
  const name = trimmed.replace(email, "").trim();
  return name ? `${name} <${email}>` : email;
}

function extractFromEmail(from) {
  const parsed = parseFromAddress(from);
  const match = parsed.match(/<([^>]+)>/);
  return match ? match[1].trim() : parsed.trim();
}

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-elastic-email.mjs recipient@example.com");
  process.exit(1);
}

const env = loadEnvLocal();
const apiKey = env.ELASTIC_EMAIL_API_KEY;
const fromRaw = env.EMAIL_FROM;

if (!apiKey || !fromRaw) {
  console.error("Missing ELASTIC_EMAIL_API_KEY or EMAIL_FROM in .env.local");
  process.exit(1);
}

const from = parseFromAddress(fromRaw);
const replyTo = extractFromEmail(fromRaw);

const body = {
  Recipients: { To: [to] },
  Content: {
    From: from,
    ReplyTo: replyTo,
    Subject: "Travelia Elastic Email test",
    Body: [
      {
        ContentType: "HTML",
        Charset: "utf-8",
        Content: "<p>If you received this, Elastic Email is working.</p>",
      },
    ],
  },
};

console.log("Sending test email via Elastic Email HTTP API...");
console.log("From:", from);
console.log("To:", to);

const res = await fetch("https://api.elasticemail.com/v4/emails/transactional", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-ElasticEmail-ApiKey": apiKey,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log("Status:", res.status);

try {
  console.log("Response:", JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log("Response:", text);
}

if (!res.ok) {
  process.exit(1);
}
