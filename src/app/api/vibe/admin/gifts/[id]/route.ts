// PUT  /api/vibe/admin/gifts/[id] — update a gift
// DELETE /api/vibe/admin/gifts/[id] — delete a gift
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const { name, emoji, gemCost, eurValueCents, popular } = body;
  const gift = await db.gift.findUnique({ where: { id } });
  if (!gift) return NextResponse.json({ error: "Cadeau introuvable" }, { status: 404 });
  const updated = await db.gift.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(emoji !== undefined && { emoji }),
      ...(gemCost !== undefined && { gemCost: Number(gemCost) }),
      ...(eurValueCents !== undefined && { eurValueCents: Number(eurValueCents) }),
      ...(popular !== undefined && { popular: !!popular }),
    },
  });
  return NextResponse.json({ ok: true, gift: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const gift = await db.gift.findUnique({ where: { id } });
  if (!gift) return NextResponse.json({ error: "Cadeau introuvable" }, { status: 404 });
  await db.gift.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
