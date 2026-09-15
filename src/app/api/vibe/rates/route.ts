// GET /api/vibe/rates — cached exchange rates
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FALLBACK_RATES, CURRENCIES } from "@/lib/vibe/constants";

export async function GET() {
  const rows = await db.exchangeRate.findMany();
  const rates: Record<string, number> = { ...FALLBACK_RATES };
  for (const r of rows) rates[r.currency] = r.rate;
  return NextResponse.json({
    rates,
    currencies: Object.values(CURRENCIES),
  });
}
