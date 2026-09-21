// POST /api/vibe/gifts/send — send a gift DIRECTLY to a profile from the
// Découvrir deck. The gift OPENS A PRIVATE CONVERSATION with the receiver:
// a Match is found-or-created (sorted pair, sender = initiator — so the
// anti-spam maxMessagesBeforeReply limit applies to the sender's future TEXT
// messages, NEVER to the gift itself since no Message row is created) and the
// GiftTx is attached to it (matchId) → the gift appears as the FIRST bubble
// of the conversation timeline, and the match stays `unlocked: false` until
// the receiver replies. Same money rules as chat gifts: only PURCHASED Vibes
// can be spent (free Vibes from streak/welcome/referral never cover gifts),
// and the receiver is credited their share (70% default) of the gift's value.
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

  // Deduct from PURCHASED Vibes only (freeGems unchanged) — atomic. The
  // Match find-or-create happens INSIDE the transaction: if anything fails
  // (match creation, gift, wallet credit…) everything rolls back.
  const match = await db.$transaction(async (tx) => {
    // Find-or-create the private conversation — sorted user pair, exactly
    // like /api/vibe/swipe (userAId < userBId, @@unique([userAId, userBId])).
    // The SENDER becomes the initiator → their future TEXT messages are
    // capped by maxMessagesBeforeReply until the receiver replies (the gift
    // itself never counts — it is a GiftTx, not a Message). An existing
    // match (locked or unlocked) is reused as-is: no duplicate, no re-assign
    // of initiatedById, and `unlocked` is NEVER flipped by a gift. The upsert
    // is atomic — two concurrent gifts between the same pair can never trip
    // the @@unique([userAId, userBId]) constraint.
    const [a, b] = [user.id, profile.userId].sort();
    const m = await tx.match.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      create: { userAId: a, userBId: b, initiatedById: user.id, unlocked: false },
      update: {}, // existant → réutilisé tel quel (voir ci-dessus)
    });

    await tx.giftTx.create({
      // Attached to the conversation → the gift IS the first message (a gift
      // bubble in the GET messages timeline — no Message row is created).
      data: { senderId: user.id, receiverId: profile.userId, giftId: dbGift.id, matchId: m.id, opened: false, messageText: note },
    });
    const res = await tx.user.updateMany({ where: { id: user.id, gems: { gte: gift.gemCost } }, data: { gems: { decrement: gift.gemCost } } });
    if (res.count === 0) {
      throw new Error("Pas assez de Vibes (ou Vibes gratuites non utilisables pour offrir).");
    }
    await tx.user.update({ where: { id: profile.userId }, data: { walletEurCents: { increment: receiverShare } } });
    await tx.gemTx.create({ data: { userId: user.id, delta: -gift.gemCost, reason: "gift" } });
    return m;
  });

  // Notify the receiver — with the matchId so the notification can deep-link
  // into the conversation where the gift is waiting (wrapped, unopened).
  const senderName = user.profile?.displayName ?? "Quelqu'un";
  await notifyGift(profile.userId, senderName, gift.name, gift.emoji, match.id);

  const updatedGems = await db.user.findUnique({ where: { id: user.id }, select: { gems: true, freeGems: true } });
  return NextResponse.json({
    ok: true,
    gift: { key: gift.key, name: gift.name, emoji: gift.emoji },
    targetName: profile.displayName,
    // The private conversation the gift was attached to (first bubble).
    matchId: match.id,
    gems: updatedGems?.gems ?? user.gems,
    freeGems: updatedGems?.freeGems ?? user.freeGems,
    creditedEurCents: receiverShare,
  });
}
