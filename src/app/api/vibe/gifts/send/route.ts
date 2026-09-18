// POST /api/vibe/gifts/send — send a gift DIRECTLY to a profile from the
// Découvrir deck (no match required — GiftTx.matchId is nullable).
// Same money rules as chat gifts: only PURCHASED Vibes can be spent
// (free Vibes from streak/welcome/referral never cover gifts), and the
// receiver is credited their share (70% default) of the gift's value.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GIFTS } from "@/lib/vibe/constants";
import { getSettings } from "@/lib/vibe/settings";
import { notifyGift } from "@/lib/vibe/notify";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { profileId, giftKey, messageText } = await req.json().catch(() => ({} as any));
  const gift = GIFTS.find((g) => g.key === giftKey);
  if (!gift) return NextResponse.json({ error: "Cadeau inconnu" }, { status: 400 });
  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json({ error: "Profil destinataire manquant" }, { status: 400 });
  }
  const dbGift = await db.gift.findUnique({ where: { key: giftKey } });
  if (!dbGift) return NextResponse.json({ error: "Cadeau introuvable en base" }, { status: 404 });

  // Resolve the deck profile → its owning user.
  const profile = await db.profile.findUnique({ where: { id: profileId }, select: { id: true, userId: true, displayName: true } });
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  if (profile.userId === user.id) {
    return NextResponse.json({ error: "Tu ne peux pas t'offrir un cadeau à toi-même 😅" }, { status: 400 });
  }

  // Total balance check (client already gates this, server re-checks).
  if (user.gems < gift.gemCost) {
    return NextResponse.json({
      error: "Pas assez de Vibes",
      needVibes: true,
      required: gift.gemCost,
    }, { status: 402 });
  }

  // CRITICAL: gifts require PURCHASED Vibes (same rule as chat gifts).
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

  // Commission: platform keeps the configured %, receiver gets the rest.
  const settings = await getSettings();
  const receiverShare = Math.round(gift.eurValueCents * (1 - settings.platformCommission));

  const note = typeof messageText === "string" && messageText.trim() ? messageText.trim().slice(0, 200) : null;

  // Deduct from PURCHASED Vibes only (freeGems unchanged) — atomic.
  await db.$transaction(async (tx) => {
    await tx.giftTx.create({
      data: { senderId: user.id, receiverId: profile.userId, giftId: dbGift.id, matchId: null, opened: false, messageText: note },
    });
    const res = await tx.user.updateMany({ where: { id: user.id, gems: { gte: gift.gemCost } }, data: { gems: { decrement: gift.gemCost } } });
    if (res.count === 0) {
      throw new Error("Pas assez de Vibes (ou Vibes gratuites non utilisables pour offrir).");
    }
    await tx.user.update({ where: { id: profile.userId }, data: { walletEurCents: { increment: receiverShare } } });
    await tx.gemTx.create({ data: { userId: user.id, delta: -gift.gemCost, reason: "gift" } });
  });

  // Notify the receiver — no matchId (the sender hasn't matched yet); the
  // notification carries the sender's name so curiosity does the rest.
  const senderName = user.profile?.displayName ?? "Quelqu'un";
  await notifyGift(profile.userId, senderName, gift.name, gift.emoji);

  const updatedGems = await db.user.findUnique({ where: { id: user.id }, select: { gems: true, freeGems: true } });
  return NextResponse.json({
    ok: true,
    gift: { key: gift.key, name: gift.name, emoji: gift.emoji },
    targetName: profile.displayName,
    gems: updatedGems?.gems ?? user.gems,
    freeGems: updatedGems?.freeGems ?? user.freeGems,
    creditedEurCents: receiverShare,
  });
}
