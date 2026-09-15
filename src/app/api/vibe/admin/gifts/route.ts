// GET  /api/vibe/admin/gifts — list all gifts from DB
// POST /api/vibe/admin/gifts — create a new gift
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const gifts = await db.gift.findMany({ orderBy: { gemCost: "asc" } });
  return NextResponse.json({ gifts });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  const { key, name, emoji, gemCost, eurValueCents, popular } = body;
  if (!key || !name || !emoji || !gemCost || !eurValueCents) {
    return NextResponse.json({ error: "Champs manquants (key, name, emoji, gemCost, eurValueCents)" }, { status: 400 });
  }
  const existing = await db.gift.findUnique({ where: { key } });
  if (existing) return NextResponse.json({ error: "Ce cadeau existe déjà" }, { status: 409 });
  const gift = await db.gift.create({
    data: {
      key,
      name,
      emoji,
      gemCost: Number(gemCost),
      eurValueCents: Number(eurValueCents),
      popular: !!popular,
    },
  });
  return NextResponse.json({ ok: true, gift });
}
