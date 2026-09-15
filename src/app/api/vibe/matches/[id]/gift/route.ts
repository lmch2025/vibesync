// POST /api/vibe/matches/[id]/gift — send a gift in a match.
// CRITICAL: Only PURCHASED Vibes can be used for gifts (not free Vibes
// from streak/welcome/referral). This prevents the platform from paying
// real money for Vibes it gave away for free.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GIFTS } from "@/lib/vibe/constants";
import { getSettings } from "@/lib/vibe/settings";
import { notifyGift } from "@/lib/vibe/notify";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { giftKey, messageText } = await req.json().catch(() => ({} as any));
  const gift = GIFTS.find((g) => g.key === giftKey);
  if (!gift) return NextResponse.json({ error: "Cadeau inconnu" }, { status: 400 });
  const dbGift = await db.gift.findUnique({ where: { key: giftKey } });
  if (!dbGift) return NextResponse.json({ error: "Cadeau introuvable en base" }, { status: 404 });

  const match = await db.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  }

  // Check total balance
  if (user.gems < gift.gemCost) {
    return NextResponse.json({ error: "Pas assez de Vibes" }, { status: 402 });
  }

  // CRITICAL: Check that the user has enough PURCHASED Vibes.
  // Free Vibes (streak, welcome, referral) cannot be used for gifts.
  const purchasedGems = user.gems - user.freeGems;
  if (purchasedGems < gift.gemCost) {
    return NextResponse.json({
      error: "Les Vibes gratuites ne peuvent pas être utilisées pour offrir des cadeaux. Achète des Vibes pour offrir.",
      needPurchased: true,
      purchasedGems,
      freeGems: user.freeGems,
      required: gift.gemCost,
    }, { status: 402 });
  }

  const receiverId = match.userAId === user.id ? match.userBId : match.userAId;

  // Commission: platform keeps the configured %, receiver gets the rest.
  const settings = await getSettings();
  const receiverShare = Math.round(gift.eurValueCents * (1 - settings.platformCommission));

  const note = typeof messageText === "string" && messageText.trim() ? messageText.trim().slice(0, 200) : null;

  // Deduct from PURCHASED Vibes only (freeGems unchanged).
  await db.$transaction(async (tx) => {
    await tx.giftTx.create({
      data: { senderId: user.id, receiverId, giftId: dbGift.id, matchId: id, opened: false, messageText: note },
    });
    // Only deduct from gems (purchased), NOT from freeGems
    const res = await tx.user.updateMany({ where: { id: user.id, gems: { gte: gift.gemCost } }, data: { gems: { decrement: gift.gemCost } } });
    if (res.count === 0) {
      throw new Error("Pas assez de Vibes (ou Vibes gratuites non utilisables pour offrir).");
    }
    await tx.user.update({ where: { id: receiverId }, data: { walletEurCents: { increment: receiverShare } } });
    await tx.gemTx.create({ data: { userId: user.id, delta: -gift.gemCost, reason: "gift" } });
  });

  // Notify the receiver that they received a gift.
  const senderName = user.profile?.displayName ?? "Quelqu'un";
  await notifyGift(receiverId, senderName, gift.name, gift.emoji, id);

  const updatedGems = await db.user.findUnique({ where: { id: user.id }, select: { gems: true, freeGems: true } });
  return NextResponse.json({
    ok: true,
    gift: { key: gift.key, name: gift.name, emoji: gift.emoji },
    gems: updatedGems?.gems ?? user.gems,
    freeGems: updatedGems?.freeGems ?? user.freeGems,
    creditedEurCents: receiverShare,
  });
}
