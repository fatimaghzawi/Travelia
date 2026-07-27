import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

const BG = "/images/bg4.PNG";

function AuthBackground() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG}
        alt=""
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
        aria-hidden
      />
      {/* Reference navy tint — sampled from mockup (~#0F375B / brand #002642) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#002642]/70 mix-blend-multiply"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#0a3558]/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,38,66,0.55)_100%)]"
        aria-hidden
      />
    </>
  );
}

function AuthFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`shrink-0 bg-[#061525]/70 py-2.5 text-center text-xs text-white/90 ${className}`}
    >
      © {new Date().getFullYear()} Travelia. All rights reserved.
    </footer>
  );
}

type CenteredAuthLayoutProps = {
  children: ReactNode;
};

export function CenteredAuthLayout({ children }: CenteredAuthLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <AuthBackground />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-[380px] shrink rounded-2xl bg-white px-5 py-5 shadow-xl sm:px-7 sm:py-6">
          {children}
        </div>
      </div>
      <AuthFooter />
    </main>
  );
}

type SplitAuthLayoutProps = {
  children: ReactNode;
};

/** Register / forgot layout: left brand panel + right form card + footer. */
export function SplitAuthLayout({ children }: SplitAuthLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <AuthBackground />

      <div className="relative z-0 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-6 px-4 py-4 md:min-h-0 md:grid-cols-2 md:items-center md:gap-10 md:px-10 lg:px-14">
        <section className="relative hidden h-full flex-col justify-center py-6 text-white md:flex">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight lg:text-5xl">
              Travel more.
              <br />
              <span className="text-[#34BDAF]">Worry less.</span>
            </h1>
            <p className="mt-4 text-base text-white/90">
              Your next adventure starts with us.
            </p>
          </div>

          <svg
            className="pointer-events-none absolute bottom-[14%] left-0 h-36 w-[90%] max-w-md text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            viewBox="0 0 320 140"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 108 C58 38, 98 22, 140 48 S 200 112, 248 72 S 286 38, 305 44"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeDasharray="8 10"
              strokeLinecap="round"
              opacity="0.95"
            />
            <g transform="translate(305 44) rotate(17.5)">
              <path d="M0 0 L-16 7 L-11 0 L-16 -7 Z" fill="currentColor" />
              <path
                d="M-8 0 L-18 8 M-8 0 L-18 -8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </section>

        <div className="mx-auto w-full max-w-[420px] self-start md:mx-0 md:self-auto md:justify-self-end">
          <div className="relative rounded-3xl bg-white px-5 py-5 shadow-2xl sm:px-8 sm:py-7">
            {children}
          </div>
        </div>
      </div>

      <AuthFooter className="relative z-10" />
    </main>
  );
}

/** Compact centered shell with logo + title for status pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <CenteredAuthLayout>
      <div className="mb-4 flex justify-center">
        <Logo size="md" />
      </div>
      <h1 className="text-xl font-bold text-[#002642] sm:text-2xl">{title}</h1>
      {subtitle ? (
        <p className="mt-1.5 text-sm text-[#67717A]">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </CenteredAuthLayout>
  );
}
