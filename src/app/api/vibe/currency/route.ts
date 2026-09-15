// POST /api/vibe/currency — set the current user's preferred currency (manual override)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { CURRENCIES } from "@/lib/vibe/constants";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { currency } = await req.json().catch(() => ({} as any));
  if (!currency || !CURRENCIES[currency]) {
    return NextResponse.json({ error: "Devise invalide" }, { status: 400 });
  }
  await db.user.update({ where: { id: user.id }, data: { currency } });
  return NextResponse.json({ ok: true, currency });
}
