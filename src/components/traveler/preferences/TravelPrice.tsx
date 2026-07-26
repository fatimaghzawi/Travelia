"use client";

import { useFormatMoney } from "@/components/traveler/preferences/TravelerPreferencesProvider";

type TravelPriceProps = {
  /** Amount stored in USD */
  amount: number;
  className?: string;
  freeLabel?: string;
};

/** Displays a USD-stored price in the traveler's preferred currency. */
export function TravelPrice({
  amount,
  className = "",
  freeLabel = "Free",
}: TravelPriceProps) {
  const formatMoney = useFormatMoney();
  if (amount === 0) {
    return <span className={className}>{freeLabel}</span>;
  }
  return <span className={className}>{formatMoney(amount)}</span>;
}
