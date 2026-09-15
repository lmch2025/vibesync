// POST /api/vibe/auth/check-phone
// Checks if a user already exists by their phone number and returns their status.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({} as any));
  if (!phone || typeof phone !== "string" || phone.length < 6) {
    return NextResponse.json({ error: "Numéro invalide" }, { status: 400 });
  }
  const normalized = phone.trim();
  // Select only pinHash — avoids fetching unnecessary fields for this check.
  const existing = await db.user.findUnique({
    where: { phone: normalized },
    select: { pinHash: true },
  });
  // Only treat the account as "existing" (PIN login flow) if they actually
  // have a PIN set. Seed-created demo profiles have no PIN, so they flow
  // through the registration path and get a PIN assigned on first "signup".
  return NextResponse.json({ exists: !!existing?.pinHash, phone: normalized });
}
