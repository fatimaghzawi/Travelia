"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyDocumentTheme,
  parseTravelerPreferences,
  TRAVELER_PREFS_KEY,
  type TravelerTheme,
} from "@/lib/traveler/preferences";

function readStoredTheme(): TravelerTheme {
  try {
    const raw = localStorage.getItem(TRAVELER_PREFS_KEY);
    if (!raw) return "light";
    return parseTravelerPreferences(JSON.parse(raw)).theme;
  } catch {
    return "light";
  }
}

function persistTheme(theme: TravelerTheme) {
  try {
    const raw = localStorage.getItem(TRAVELER_PREFS_KEY);
    const current = raw
      ? parseTravelerPreferences(JSON.parse(raw))
      : parseTravelerPreferences(null);
    localStorage.setItem(
      TRAVELER_PREFS_KEY,
      JSON.stringify({ ...current, theme })
    );
  } catch {
    /* ignore quota */
  }
}

/** Shared light/dark/system theme for surfaces outside the traveler shell (e.g. admin). */
export function useDocumentTheme() {
  const [theme, setThemeState] = useState<TravelerTheme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = readStoredTheme();
    setThemeState(next);
    applyDocumentTheme(next);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hydrated, theme]);

  const setTheme = useCallback((next: TravelerTheme) => {
    setThemeState(next);
    persistTheme(next);
    applyDocumentTheme(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
    );
  }, [setTheme, theme]);

  return { theme, setTheme, cycleTheme, hydrated };
}
