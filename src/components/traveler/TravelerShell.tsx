import type { ReactNode } from "react";
import {
  TravelerNavbar,
  type TravelerNavUser,
} from "@/components/traveler/TravelerNavbar";
import { TravelerClientProviders } from "@/components/traveler/TravelerClientProviders";

type TravelerShellProps = {
  children: ReactNode;
  /** Session user from the server layout (avoids empty navbar on first paint). */
  user?: TravelerNavUser | null;
};

/**
 * Traveler chrome (server). Book export pages hide chrome via CSS
 * (`body:has(.trip-book)`) so this stays a server component — no pathname
 * client boundary wrapping the whole traveler tree.
 */
export function TravelerShell({ children, user = null }: TravelerShellProps) {
  return (
    <TravelerClientProviders>
      <div className="traveler-glass relative flex min-h-dvh flex-col">
        <div className="traveler-glass__glow" aria-hidden />

        <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
          <div className="traveler-navbar-wrap">
            <TravelerNavbar initialUser={user} />
          </div>

          <main className="traveler-main flex-1 px-2 py-3 sm:px-4 sm:py-8 lg:py-10">
            <div className="traveler-glass__sheet mx-auto w-full max-w-7xl px-2.5 py-4 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>

          <footer className="traveler-chrome mt-auto border-t border-white/60 bg-white/70 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-4 text-xs text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-5 sm:text-sm">
              <p className="order-2 sm:order-1">
                © {new Date().getFullYear()} Travelia. All rights reserved.
              </p>
              <nav
                className="order-1 flex flex-wrap items-center gap-x-4 gap-y-2 sm:order-2 sm:gap-x-5"
                aria-label="Legal"
              >
                <button type="button" className="transition hover:text-[#127E83]">
                  Terms of Service
                </button>
                <button type="button" className="transition hover:text-[#127E83]">
                  Privacy Policy
                </button>
                <button type="button" className="transition hover:text-[#127E83]">
                  Help Center
                </button>
              </nav>
            </div>
          </footer>
        </div>
      </div>
    </TravelerClientProviders>
  );
}
