// GET /api/vibe/detect
// Silent currency + country detection from the x-vercel-ip-country header
// (provided automatically by Vercel's edge network). Called once on page load
// so anonymous visitors see prices in their local currency without any UI
// switcher. Falls back to XAF (FCFA) — the primary target market — if the
// header is absent (e.g. local dev).
import { NextResponse } from "next/server";
import { detectCurrencyFromCountry, CURRENCIES } from "@/lib/vibe/constants";

export async function GET(req: Request) {
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("x-country") ||
    "CM"; // default to Cameroun (FCFA) for the sandbox
  const currency = detectCurrencyFromCountry(country);
  return NextResponse.json({
    country,
    currency,
    symbol: CURRENCIES[currency]?.symbol ?? "FCFA",
    flag: CURRENCIES[currency]?.flag ?? "🇨🇲",
  });
}
