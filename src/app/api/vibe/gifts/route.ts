// GET /api/vibe/gifts — gift catalog (from DB, falls back to constants)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { GIFTS } from "@/lib/vibe/constants";

export async function GET() {
  let gifts = await db.gift.findMany({ orderBy: { gemCost: "asc" } });
  if (gifts.length === 0) {
    // Fallback to constants if DB empty (shouldn't happen after seed).
    return NextResponse.json({ gifts: GIFTS });
  }
  return NextResponse.json({
    gifts: gifts.map((g) => ({
      id: g.id,
      key: g.key,
      name: g.name,
      emoji: g.emoji,
      gemCost: g.gemCost,
      eurValueCents: g.eurValueCents,
      popular: g.popular,
    })),
  });
}
