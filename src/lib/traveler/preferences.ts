export type TravelerCurrency = "USD" | "LBP";
export type TravelerTheme = "light" | "dark" | "system";

export type TravelerPreferences = {
  currency: TravelerCurrency;
  theme: TravelerTheme;
  /** Prefer quieter UI motion */
  reduceMotion: boolean;
  /** Slightly denser dashboard cards */
  compactLayout: boolean;
  /** Local preference only — soft reminder for trip digests */
  tripReminders: boolean;
};

export const TRAVELER_PREFS_KEY = "travelia.traveler.preferences.v1";
export const LBP_FALLBACK_RATE = 89500;

export const DEFAULT_TRAVELER_PREFERENCES: TravelerPreferences = {
  currency: "USD",
  theme: "light",
  reduceMotion: false,
  compactLayout: false,
  tripReminders: true,
};

export function parseTravelerPreferences(
  raw: unknown
): TravelerPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TRAVELER_PREFERENCES };
  const o = raw as Partial<TravelerPreferences>;
  return {
    currency: o.currency === "LBP" ? "LBP" : "USD",
    theme:
      o.theme === "dark" || o.theme === "system" || o.theme === "light"
        ? o.theme
        : "light",
    reduceMotion: Boolean(o.reduceMotion),
    compactLayout: Boolean(o.compactLayout),
    tripReminders:
      typeof o.tripReminders === "boolean"
        ? o.tripReminders
        : DEFAULT_TRAVELER_PREFERENCES.tripReminders,
  };
}

/** Amounts in the app are stored as USD. Convert for display when needed. */
export function convertUsdAmount(
  amountUsd: number,
  currency: TravelerCurrency,
  usdToLbp: number
): number {
  if (currency === "LBP") return amountUsd * usdToLbp;
  return amountUsd;
}

export function formatTravelerMoney(
  amountUsd: number,
  currency: TravelerCurrency,
  usdToLbp: number
): string {
  const value = convertUsdAmount(amountUsd, currency, usdToLbp);
  if (currency === "LBP") {
    return `${new Intl.NumberFormat("en-LB", {
      maximumFractionDigits: 0,
    }).format(Math.round(value))} ل.ل.`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amountUsd % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function resolveTheme(theme: TravelerTheme): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyDocumentTheme(theme: TravelerTheme) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}
