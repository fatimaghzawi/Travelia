import type { ReactNode } from "react";

export type LegalSection = {
  title: string;
  body: ReactNode;
};

export type LegalDocumentContent = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

export const TERMS_OF_SERVICE: LegalDocumentContent = {
  title: "Terms of Service",
  updatedAt: "July 22, 2026",
  intro:
    "Welcome to Travelia. By creating an account or using our website and services, you agree to these Terms of Service. Please read them carefully.",
  sections: [
    {
      title: "1. About Travelia",
      body: (
        <p>
          Travelia is a travel planning and booking platform that helps travelers
          discover destinations, organize trips, and manage related bookings.
          These terms govern your access to and use of Travelia&apos;s websites,
          apps, and related services (collectively, the &quot;Services&quot;).
        </p>
      ),
    },
    {
      title: "2. Eligibility & accounts",
      body: (
        <>
          <p>
            You must be at least 18 years old (or the age of majority in your
            country) to create an account. You are responsible for keeping your
            login credentials secure and for all activity under your account.
          </p>
          <p>
            You agree to provide accurate registration information and to keep it
            up to date. We may suspend or terminate accounts that violate these
            terms or appear fraudulent or abusive.
          </p>
        </>
      ),
    },
    {
      title: "3. Acceptable use",
      body: (
        <>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the Services for unlawful, harmful, or deceptive purposes</li>
            <li>Interfere with or disrupt the platform, security, or other users</li>
            <li>Scrape, reverse engineer, or misuse our content or APIs</li>
            <li>Upload false, misleading, or infringing content</li>
            <li>Attempt to gain unauthorized access to any system or data</li>
          </ul>
        </>
      ),
    },
    {
      title: "4. Bookings & third parties",
      body: (
        <p>
          Some bookings or travel services may be fulfilled by third-party
          providers. Those providers may have their own terms, cancellation
          policies, and fees. Travelia is not responsible for the acts,
          omissions, or services of third parties, except where required by
          applicable law.
        </p>
      ),
    },
    {
      title: "5. Content & intellectual property",
      body: (
        <p>
          Travelia and its licensors own the platform, branding, and related
          intellectual property. You retain ownership of content you submit, and
          you grant Travelia a non-exclusive license to use that content as needed
          to operate and improve the Services.
        </p>
      ),
    },
    {
      title: "6. Disclaimers",
      body: (
        <p>
          The Services are provided &quot;as is&quot; and &quot;as available.&quot;
          Travel information may change, and we do not guarantee uninterrupted
          access, complete accuracy of destination content, or that every booking
          request will succeed.
        </p>
      ),
    },
    {
      title: "7. Limitation of liability",
      body: (
        <p>
          To the fullest extent permitted by law, Travelia will not be liable for
          indirect, incidental, special, consequential, or punitive damages arising
          from your use of the Services.
        </p>
      ),
    },
    {
      title: "8. Changes & termination",
      body: (
        <p>
          We may update these terms from time to time. Continued use of the
          Services after changes become effective means you accept the updated
          terms. You may stop using Travelia at any time.
        </p>
      ),
    },
    {
      title: "9. Contact",
      body: (
        <p>
          Questions about these Terms of Service? Contact us at{" "}
          <a
            href="mailto:support@travelia.app"
            className="font-medium text-[#127E83] hover:underline"
          >
            support@travelia.app
          </a>
          .
        </p>
      ),
    },
  ],
};

export const PRIVACY_POLICY: LegalDocumentContent = {
  title: "Privacy Policy",
  updatedAt: "July 22, 2026",
  intro:
    "This Privacy Policy explains how Travelia collects, uses, shares, and protects personal information when you use our website and services.",
  sections: [
    {
      title: "1. Information we collect",
      body: (
        <>
          <p>We may collect:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account details</strong> — name, email, phone, country,
              password (stored hashed), and optional bio
            </li>
            <li>
              <strong>Profile & travel data</strong> — trip plans, bookings,
              preferences, favorites, and related activity
            </li>
            <li>
              <strong>Technical data</strong> — device/browser info, IP address,
              and usage logs needed for security and performance
            </li>
            <li>
              <strong>Communications</strong> — messages you send us, and emails
              we send about verification, resets, or service notices
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "2. How we use your information",
      body: (
        <>
          <p>We use personal data to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Create and manage your account</li>
            <li>Provide trip planning, booking, and dashboard features</li>
            <li>Verify email addresses and reset passwords securely</li>
            <li>Improve product performance, safety, and user experience</li>
            <li>Comply with legal obligations and enforce our terms</li>
          </ul>
          <p>
            We do not sell your personal information. We may send service-related
            messages that are necessary to operate your account.
          </p>
        </>
      ),
    },
    {
      title: "3. Sharing of information",
      body: (
        <p>
          We may share data with trusted processors that help us run Travelia,
          only as needed to provide the Services and under appropriate
          safeguards. We may also disclose information if required by law or to
          protect rights and safety.
        </p>
      ),
    },
    {
      title: "4. Cookies & similar technologies",
      body: (
        <p>
          We use cookies and similar technologies for authentication, session
          security, and basic analytics. You can control cookies through your
          browser settings, but disabling essential cookies may affect sign-in
          and core features.
        </p>
      ),
    },
    {
      title: "5. Data retention & security",
      body: (
        <p>
          We keep personal data only as long as needed for the purposes described
          above. We use reasonable technical and organizational measures to
          protect your information. No method of transmission or storage is 100%
          secure.
        </p>
      ),
    },
    {
      title: "6. Your rights",
      body: (
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or export your personal data. To make a privacy request, email{" "}
          <a
            href="mailto:privacy@travelia.app"
            className="font-medium text-[#127E83] hover:underline"
          >
            privacy@travelia.app
          </a>
          .
        </p>
      ),
    },
    {
      title: "7. Children",
      body: (
        <p>
          Travelia is not directed to children under 16, and we do not knowingly
          collect personal information from children.
        </p>
      ),
    },
    {
      title: "8. International transfers",
      body: (
        <p>
          Your information may be processed in countries other than your own.
          Where required, we use appropriate safeguards for cross-border
          transfers.
        </p>
      ),
    },
    {
      title: "9. Changes to this policy",
      body: (
        <p>
          We may update this Privacy Policy periodically. We will revise the
          &quot;Last updated&quot; date above and, when changes are material,
          provide additional notice where appropriate.
        </p>
      ),
    },
    {
      title: "10. Contact",
      body: (
        <p>
          For privacy questions, contact{" "}
          <a
            href="mailto:privacy@travelia.app"
            className="font-medium text-[#127E83] hover:underline"
          >
            privacy@travelia.app
          </a>
          .
        </p>
      ),
    },
  ],
};
