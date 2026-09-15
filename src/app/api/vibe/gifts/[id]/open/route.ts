// POST /api/vibe/gifts/[id]/open — mark a received gift as opened.
// Only the receiver can open it. Returns the gift details for the reveal UI.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const giftTx = await db.giftTx.findUnique({
    where: { id },
    include: { gift: true, sender: { include: { profile: true } } },
  });
  if (!giftTx) return NextResponse.json({ error: "Cadeau introuvable" }, { status: 404 });
  if (giftTx.receiverId !== user.id) {
    return NextResponse.json({ error: "Seul le destinataire peut ouvrir ce cadeau" }, { status: 403 });
  }
  if (!giftTx.opened) {
    await db.giftTx.update({
      where: { id },
      data: { opened: true, openedAt: new Date() },
    });
  }
  return NextResponse.json({
    ok: true,
    gift: {
      id: giftTx.id,
      key: giftTx.gift.key,
      name: giftTx.gift.name,
      emoji: giftTx.gift.emoji,
      gemCost: giftTx.gift.gemCost,
      eurValueCents: giftTx.gift.eurValueCents,
      messageText: giftTx.messageText,
      fromName: giftTx.sender.profile?.displayName ?? "Quelqu'un",
      opened: true,
    },
  });
}
