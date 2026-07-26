"use client";

import type { ReactNode } from "react";
import { TravelerPreferencesProvider } from "@/components/traveler/preferences/TravelerPreferencesProvider";

/** Client boundary for traveler prefs (currency, theme, etc.). */
export function TravelerClientProviders({ children }: { children: ReactNode }) {
  return <TravelerPreferencesProvider>{children}</TravelerPreferencesProvider>;
}
