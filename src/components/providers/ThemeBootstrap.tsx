"use client";

import { useLayoutEffect } from "react";
import {
  applyDocumentTheme,
  parseTravelerPreferences,
  TRAVELER_PREFS_KEY,
  type TravelerTheme,
} from "@/lib/traveler/preferences";

/** Apply saved theme before paint to avoid a raw `<script>` (blocked in React 19). */
export function ThemeBootstrap() {
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(TRAVELER_PREFS_KEY);
      const theme: TravelerTheme = raw
        ? parseTravelerPreferences(JSON.parse(raw)).theme
        : "light";
      applyDocumentTheme(theme);
    } catch {
      applyDocumentTheme("light");
    }
  }, []);

  return null;
}
