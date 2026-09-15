"use client";
// useCurrency — formats EUR-based amounts into the active currency.
import { useVibe } from "./store";
import { formatMoney, formatIn, formatGems, formatPercent, RateMap } from "./currency";
import { CURRENCIES, FALLBACK_RATES } from "./constants";

export function useCurrency() {
  const rates = useVibe((s) => s.rates);
  const activeCurrency = useVibe((s) => s.activeCurrency);
  const setActiveCurrency = useVibe((s) => s.setActiveCurrency);

  const rateMap: RateMap = Object.keys(rates).length ? rates : FALLBACK_RATES;

  return {
    currency: activeCurrency,
    setCurrency: setActiveCurrency,
    money: (eur: number) => formatMoney(eur, activeCurrency, rateMap),
    moneyCents: (eurCents: number) => formatMoney(eurCents / 100, activeCurrency, rateMap),
    /// Format a raw amount already expressed in the given currency (no conversion).
    /// Use this for fixed App-Store-style price tiers.
    formatIn: (amount: number, currency: string) => formatIn(amount, currency),
    gems: (n: number) => formatGems(n),
    percent: (n: number, d?: number) => formatPercent(n, d),
    convert: (eur: number) => eur * (rateMap[activeCurrency] ?? 1),
    symbol: CURRENCIES[activeCurrency]?.symbol ?? "€",
    flag: CURRENCIES[activeCurrency]?.flag ?? "🇪🇺",
    list: Object.values(CURRENCIES),
  };
}
