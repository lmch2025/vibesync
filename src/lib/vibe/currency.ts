// Currency formatting + exchange rate helpers (isomorphic, used server & client).
//
// IMPORTANT — hydration safety:
// We NEVER use `Intl.NumberFormat` with `style: "currency"` because the
// currency SYMBOL it emits is not stable across runtimes (e.g. Node full-ICU
// renders XAF as "FCFA" while the browser V8 ICU renders it as "XAF", causing
// hydration mismatches). Instead we format the plain decimal number (stable)
// and append the symbol from our own CURRENCIES config (deterministic).
// `useGrouping: false` removes any thousands-separator character discrepancy.
import { CURRENCIES, FALLBACK_RATES, type CurrencyConfig } from "./constants";

export type RateMap = Record<string, number>;

/// Currencies whose symbol is written before the amount.
const SYMBOL_BEFORE = new Set(["USD", "GBP", "CAD", "JPY"]);
/// Currencies with no fractional digits (0 decimals).
const NO_FRACTION = new Set(["JPY", "XAF"]);

function formatValue(value: number, currency: string): string {
  const cfg: CurrencyConfig = CURRENCIES[currency] ?? CURRENCIES.EUR;
  const noFraction = NO_FRACTION.has(currency);
  const num = new Intl.NumberFormat(cfg.locale, {
    maximumFractionDigits: noFraction ? 0 : 2,
    minimumFractionDigits: noFraction ? 0 : 2,
    useGrouping: false,
  }).format(value);
  return SYMBOL_BEFORE.has(currency) ? `${cfg.symbol}${num}` : `${num} ${cfg.symbol}`;
}

export function formatMoney(eurAmount: number, currency: string, rates: RateMap = FALLBACK_RATES): string {
  const rate = rates[currency] ?? 1;
  return formatValue(eurAmount * rate, currency);
}

/// Format a raw amount already expressed in the given currency (no conversion).
/// Use this for fixed App-Store-style price tiers.
export function formatIn(amount: number, currency: string): string {
  return formatValue(amount, currency);
}

export function formatGems(n: number): string {
  // Gem balances are only rendered client-side (loaded after auth), so grouping
  // is safe here. Use plain number formatting — no currency symbol involved.
  return new Intl.NumberFormat("fr-FR", { useGrouping: true }).format(n);
}

/// Deterministic integer formatter (no grouping, no locale-sensitive separator).
/// Use this for SSR-rendered counts to guarantee identical server/client output.
export function formatInt(n: number): string {
  return Math.round(n).toString();
}

export function convertEurTo(eurAmount: number, currency: string, rates: RateMap = FALLBACK_RATES): number {
  return eurAmount * (rates[currency] ?? 1);
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
