import { getAppUrl } from "@/lib/app-url";
import { getLogoImageSrc } from "@/lib/email/logo";

const BRAND = {
  teal: "#127E83",
  tealDark: "#0f6b6f",
  navy: "#012A3E",
  navyDeep: "#002642",
  muted: "#67717A",
  light: "#f4fafb",
  border: "#d1e8ea",
  white: "#ffffff",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type EmailLayoutOptions = {
  preheader: string;
  eyebrow: string;
  title: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  linkFallback: string;
  expiryNote: string;
  footerNote?: string;
};

function emailLayout(options: EmailLayoutOptions): string {
  const {
    preheader,
    eyebrow,
    title,
    greeting,
    body,
    ctaLabel,
    ctaUrl,
    linkFallback,
    expiryNote,
    footerNote,
  } = options;

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#eef4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(180deg,#e8f3f5 0%,#eef4f6 100%);padding:32px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="padding:0 8px 20px 8px;text-align:center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="background:${BRAND.navyDeep};border-radius:20px 20px 0 0;padding:28px 24px 32px 24px;">
                    ${(() => {
                      const logoSrc = getLogoImageSrc();
                      return logoSrc
                        ? `<img src="${logoSrc}" alt="Travelia" width="160" style="display:block;margin:0 auto 16px auto;max-width:160px;height:auto;border:0;" />`
                        : `<p style="margin:0 0 16px 0;font-size:20px;font-weight:700;letter-spacing:0.02em;color:#ffffff;">Travelia</p>`;
                    })()}
                    <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
                      Your journey starts here
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="padding:0 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.white};border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 18px 48px rgba(1,42,62,0.10);">
                <!-- Accent strip -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${BRAND.teal} 0%,#3db8bd 50%,${BRAND.tealDark} 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <tr>
                  <td style="padding:36px 32px 8px 32px;">
                    <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.teal};">
                      ${escapeHtml(eyebrow)}
                    </p>
                    <h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.25;font-weight:700;color:${BRAND.navy};">
                      ${escapeHtml(title)}
                    </h1>
                    <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:${BRAND.navy};">
                      ${escapeHtml(greeting)}
                    </p>
                    <p style="margin:0;font-size:16px;line-height:1.65;color:${BRAND.muted};">
                      ${body}
                    </p>
                  </td>
                </tr>

                <!-- Decorative travel row -->
                <tr>
                  <td style="padding:24px 32px 8px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.light};border:1px solid ${BRAND.border};border-radius:14px;">
                      <tr>
                        <td style="padding:18px 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="33%" align="center" style="font-size:22px;line-height:1;">✈️</td>
                              <td width="33%" align="center" style="font-size:22px;line-height:1;">🌍</td>
                              <td width="33%" align="center" style="font-size:22px;line-height:1;">🧳</td>
                            </tr>
                            <tr>
                              <td colspan="3" align="center" style="padding-top:10px;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                                Discover destinations, plan trips, and travel with confidence.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding:28px 32px 12px 32px;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block;background:${BRAND.teal};background:linear-gradient(135deg,${BRAND.teal} 0%,${BRAND.tealDark} 100%);color:${BRAND.white};font-size:16px;font-weight:700;text-decoration:none;padding:15px 34px;border-radius:999px;box-shadow:0 10px 24px rgba(18,126,131,0.28);">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding:8px 32px 28px 32px;">
                    <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                      ${escapeHtml(linkFallback)}
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:${BRAND.teal};">
                      <a href="${ctaUrl}" target="_blank" style="color:${BRAND.teal};text-decoration:underline;">${ctaUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Expiry -->
                <tr>
                  <td style="padding:0 32px 32px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff8e6;border:1px solid #f3dfb0;border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#8a6d1d;">
                          ⏱ ${escapeHtml(expiryNote)}
                        </td>
                      </tr>
                    </table>
                    ${
                      footerNote
                        ? `<p style="margin:16px 0 0 0;font-size:13px;line-height:1.55;color:${BRAND.muted};">${footerNote}</p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 12px 8px 12px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;color:${BRAND.muted};">
                © ${year} Travelia · Crafted for curious travelers
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                <a href="${getAppUrl()}" style="color:${BRAND.teal};text-decoration:none;">Visit Travelia</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildVerificationEmailHtml(name: string, token: string): string {
  const link = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  return emailLayout({
    preheader: "One quick step to activate your Travelia account.",
    eyebrow: "Email verification",
    title: "Confirm your email",
    greeting: `Hi ${name}, welcome aboard!`,
    body: "Thanks for joining Travelia. Confirm your email address to unlock your account, save your trips, and start exploring the world with us.",
    ctaLabel: "Verify my email",
    ctaUrl: link,
    linkFallback: "If the button does not work, copy and paste this link into your browser:",
    expiryNote: "This verification link expires in 24 hours for your security.",
  });
}

export function buildPasswordResetEmailHtml(name: string, token: string): string {
  const link = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  return emailLayout({
    preheader: "Reset your Travelia password securely.",
    eyebrow: "Password reset",
    title: "Reset your password",
    greeting: `Hi ${name},`,
    body: "We received a request to reset your Travelia password. Tap the button below to choose a new one. If you did not request this, you can safely ignore this email.",
    ctaLabel: "Reset password",
    ctaUrl: link,
    linkFallback: "If the button does not work, copy and paste this link into your browser:",
    expiryNote: "This reset link expires in 1 hour for your security.",
    footerNote:
      "Didn't request a reset? No action is needed — your password will stay the same.",
  });
}

const TYPE_EYEBROW: Record<string, string> = {
  booking: "Booking update",
  trip: "Trip update",
  reminder: "Reminder",
  promotion: "Travelia news",
  announcement: "Announcement",
  verification: "Verification",
};

export function buildNotificationEmailHtml(opts: {
  name: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  type?: string;
}): string {
  const eyebrow = TYPE_EYEBROW[opts.type || ""] || "Travelia";
  return emailLayout({
    preheader: opts.title,
    eyebrow,
    title: opts.title,
    greeting: `Hi ${opts.name},`,
    body: escapeHtml(opts.message).replace(/\n/g, "<br />"),
    ctaLabel: opts.ctaLabel,
    ctaUrl: opts.ctaUrl,
    linkFallback: "If the button does not work, copy and paste this link into your browser:",
    expiryNote: "You’re receiving this because you have a Travelia account.",
  });
}
