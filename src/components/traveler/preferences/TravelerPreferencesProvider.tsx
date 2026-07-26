"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentTheme,
  DEFAULT_TRAVELER_PREFERENCES,
  formatTravelerMoney,
  LBP_FALLBACK_RATE,
  parseTravelerPreferences,
  TRAVELER_PREFS_KEY,
  type TravelerCurrency,
  type TravelerPreferences,
  type TravelerTheme,
} from "@/lib/traveler/preferences";

type TravelerPreferencesContextValue = {
  prefs: TravelerPreferences;
  hydrated: boolean;
  /** Live USD→LBP rate (fallback when offline). */
  usdToLbp: number;
  rateStatus: "loading" | "ready" | "offline";
  setCurrency: (currency: TravelerCurrency) => void;
  setTheme: (theme: TravelerTheme) => void;
  setPref: <K extends keyof TravelerPreferences>(
    key: K,
    value: TravelerPreferences[K]
  ) => void;
  resetPrefs: () => void;
  /** Format a USD-stored amount using the active currency preference. */
  formatMoney: (amountUsd: number) => string;
};

const TravelerPreferencesContext =
  createContext<TravelerPreferencesContextValue | null>(null);

function readStoredPrefs(): TravelerPreferences {
  try {
    const raw = localStorage.getItem(TRAVELER_PREFS_KEY);
    if (!raw) return { ...DEFAULT_TRAVELER_PREFERENCES };
    return parseTravelerPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TRAVELER_PREFERENCES };
  }
}

function persistPrefs(prefs: TravelerPreferences) {
  try {
    localStorage.setItem(TRAVELER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

export function TravelerPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [prefs, setPrefs] = useState<TravelerPreferences>(
    DEFAULT_TRAVELER_PREFERENCES
  );
  const [hydrated, setHydrated] = useState(false);
  const [usdToLbp, setUsdToLbp] = useState(LBP_FALLBACK_RATE);
  const [rateStatus, setRateStatus] = useState<"loading" | "ready" | "offline">(
    "loading"
  );

  useEffect(() => {
    const next = readStoredPrefs();
    setPrefs(next);
    applyDocumentTheme(next.theme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistPrefs(prefs);
    applyDocumentTheme(prefs.theme);
    document.documentElement.dataset.compact = prefs.compactLayout
      ? "true"
      : "false";
    document.documentElement.dataset.reduceMotion = prefs.reduceMotion
      ? "true"
      : "false";
  }, [prefs, hydrated]);

  useEffect(() => {
    if (!hydrated || prefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hydrated, prefs.theme]);

  useEffect(() => {
    let cancelled = false;
    async function loadRate() {
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json"
        );
        if (!res.ok) throw new Error("rate");
        const json = (await res.json()) as { usd?: { lbp?: number } };
        const next = json.usd?.lbp;
        if (!next || !Number.isFinite(next)) throw new Error("missing");
        if (!cancelled) {
          setUsdToLbp(next);
          setRateStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setUsdToLbp(LBP_FALLBACK_RATE);
          setRateStatus("offline");
        }
      }
    }
    void loadRate();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((partial: Partial<TravelerPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo<TravelerPreferencesContextValue>(
    () => ({
      prefs,
      hydrated,
      usdToLbp,
      rateStatus,
      setCurrency: (currency) => patch({ currency }),
      setTheme: (theme) => patch({ theme }),
      setPref: (key, val) => patch({ [key]: val }),
      resetPrefs: () => setPrefs({ ...DEFAULT_TRAVELER_PREFERENCES }),
      formatMoney: (amountUsd) =>
        formatTravelerMoney(amountUsd, prefs.currency, usdToLbp),
    }),
    [prefs, hydrated, usdToLbp, rateStatus, patch]
  );

  return (
    <TravelerPreferencesContext.Provider value={value}>
      {children}
    </TravelerPreferencesContext.Provider>
  );
}

export function useTravelerPreferences() {
  const ctx = useContext(TravelerPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useTravelerPreferences must be used within TravelerPreferencesProvider"
    );
  }
  return ctx;
}

/** Safe formatter when provider may be absent (falls back to USD). */
export function useFormatMoney() {
  const ctx = useContext(TravelerPreferencesContext);
  return useCallback(
    (amountUsd: number) => {
      if (!ctx) {
        return formatTravelerMoney(amountUsd, "USD", LBP_FALLBACK_RATE);
      }
      return ctx.formatMoney(amountUsd);
    },
    [ctx]
  );
}
