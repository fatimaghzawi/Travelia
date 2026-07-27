import { Resend } from "resend";
import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import {
  buildVerificationEmailHtml,
  buildPasswordResetEmailHtml,
} from "@/lib/email/templates";

export { buildVerificationEmailHtml, buildPasswordResetEmailHtml };

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Normalize "Name email@x.com" → `Name <email@x.com>`. */
function parseFromAddress(from: string): string {
  const trimmed = from.trim();
  if (trimmed.includes("<")) return trimmed;

  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (!emailMatch) return trimmed;

  const email = emailMatch[0];
  const name = trimmed.replace(email, "").trim();
  return name ? `${name} <${email}>` : email;
}

function extractFromEmail(from: string): string {
  const parsed = parseFromAddress(from);
  const match = parsed.match(/<([^>]+)>/);
  return match ? match[1].trim() : parsed.trim();
}

function parseElasticEmailError(status: number, detail: string): string {
  try {
    const json = JSON.parse(detail) as { Error?: string; error?: string };
    const message = json.Error ?? json.error;
    if (message) {
      return `Elastic Email API error (${status}): ${message}`;
    }
  } catch {
    // Not JSON — use raw text below.
  }

  return `Elastic Email API error (${status}): ${detail || "Unknown error"}`;
}

async function sendWithNodemailer(input: SendEmailInput): Promise<void> {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? "Travelia <noreply@travelia.local>";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

/** Elastic Email HTTP API (recommended — uses ELASTIC_EMAIL_API_KEY). */
async function sendWithElasticEmailApi(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  const fromRaw = process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error("ELASTIC_EMAIL_API_KEY is required for Elastic Email.");
  }
  if (!fromRaw) {
    throw new Error(
      "EMAIL_FROM is required for Elastic Email and must be a verified sender."
    );
  }

  const from = parseFromAddress(fromRaw);
  const replyTo = extractFromEmail(fromRaw);
  const content: Record<string, unknown> = {
    From: from,
    ReplyTo: replyTo,
    Subject: input.subject,
    Body: [
      {
        ContentType: "HTML",
        Charset: "utf-8",
        Content: input.html,
      },
    ],
  };

  const body: Record<string, unknown> = {
    Recipients: { To: [input.to] },
    Content: content,
  };

  if (input.text) {
    (body.Content as { Body: unknown[] }).Body.unshift({
      ContentType: "PlainText",
      Charset: "utf-8",
      Content: input.text,
    });
  }

  const res = await fetch("https://api.elasticemail.com/v4/emails/transactional", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ElasticEmail-ApiKey": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(parseElasticEmailError(res.status, detail));
  }

  const result = (await res.json()) as { TransactionID?: string; MessageID?: string };
  logger.info("Elastic Email sent", {
    to: input.to,
    transactionId: result.TransactionID ?? result.MessageID ?? null,
  });
}

/** Elastic Email SMTP relay — requires SMTP credentials from Elastic Email dashboard. */
async function sendWithElasticEmailSmtp(input: SendEmailInput): Promise<void> {
  const apiKey =
    process.env.ELASTIC_EMAIL_API_KEY ?? process.env.SMTP_PASS;
  const user =
    process.env.ELASTIC_EMAIL_USERNAME ?? process.env.SMTP_USER;

  if (!apiKey || !user) {
    throw new Error(
      "Elastic Email requires ELASTIC_EMAIL_API_KEY and ELASTIC_EMAIL_USERNAME (or SMTP_PASS / SMTP_USER)."
    );
  }

  const fromRaw = process.env.EMAIL_FROM;
  if (!fromRaw) {
    throw new Error(
      "EMAIL_FROM is required for Elastic Email and must be a verified sender."
    );
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  const from = parseFromAddress(fromRaw);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.elasticemail.com",
    port,
    secure: port === 465,
    auth: {
      user,
      pass: apiKey,
    },
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

async function sendWithElasticEmail(input: SendEmailInput): Promise<void> {
  const useSmtp =
    process.env.ELASTIC_EMAIL_USE_SMTP === "true" ||
    process.env.ELASTIC_EMAIL_USE_SMTP === "1";

  if (useSmtp) {
    await sendWithElasticEmailSmtp(input);
    return;
  }

  await sendWithElasticEmailApi(input);
}

async function sendWithResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Travelia <onboarding@resend.dev>";
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

/**
 * Email providers:
 * - nodemailer → local SMTP (Mailpit, etc.)
 * - elasticemail → Elastic Email HTTP API (SMTP optional via ELASTIC_EMAIL_USE_SMTP)
 * - resend → Resend HTTP API (production default)
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  const provider =
    process.env.EMAIL_PROVIDER ?? (isProd ? "resend" : "nodemailer");

  try {
    if (provider === "elasticemail" || provider === "elastic") {
      await sendWithElasticEmail(input);
    } else if (provider === "resend") {
      await sendWithResend(input);
    } else {
      await sendWithNodemailer(input);
    }
  } catch (error) {
    logger.error("Failed to send email", { to: input.to, error });
    throw error;
  }
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your Travelia email",
    html: buildVerificationEmailHtml(name, token),
    text: `Verify your email: ${getAppUrl()}/verify-email?token=${token}`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your Travelia password",
    html: buildPasswordResetEmailHtml(name, token),
    text: `Reset your password: ${getAppUrl()}/reset-password?token=${token}`,
  });
}
