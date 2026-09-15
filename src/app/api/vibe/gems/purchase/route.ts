// POST /api/vibe/gems/purchase — simulate a Stripe checkout success.
// In production this is the webhook handler after Stripe confirms payment.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GEM_PACKS } from "@/lib/vibe/constants";

export async function POST(req: Request) {
  let user = await getCurrentUser();
  const body = await req.json().catch(() => ({} as any));
  const { packId, currency, userId } = body;

  if (!user && userId) {
    user = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
  }

  // Fallback to first available demo user if sandbox/mobile anonymous
  if (!user) {
    user = await db.user.findFirst({ include: { profile: true } });
  }

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const pack = GEM_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pack inconnu" }, { status: 400 });
  const tier = pack.tiers.find((t) => t.currency === currency) ?? pack.tiers[0];
  const total = pack.gems + pack.bonus;
  const eurPaidCents = Math.round(tier.amount * 100);

  let createdTx: any = null;

  await db.$transaction(async (tx) => {
    // Purchased Vibes increment `gems` only (NOT `freeGems`), so they CAN be used for gifts.
    await tx.user.update({ where: { id: user.id }, data: { gems: { increment: total } } });
    createdTx = await tx.gemTx.create({
      data: {
        userId: user.id,
        delta: total,
        reason: "purchase",
        eurPaidCents,
      },
    });

    // In-app Notification for purchase
    await tx.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: `Recharge réussie ! +${total} Vibes 💎`,
        body: `Ton compte a été crédité de ${total} Vibes (${pack.title}). Profite de tes super-pouvoirs !`,
        icon: "💎",
        actionUrl: "/wallet",
      },
    });
  });

  const updated = await db.user.findUnique({
    where: { id: user.id },
    select: { gems: true, freeGems: true, walletEurCents: true },
  });

  return NextResponse.json({
    ok: true,
    gems: updated?.gems ?? user.gems + total,
    freeGems: updated?.freeGems ?? user.freeGems,
    walletEurCents: updated?.walletEurCents ?? user.walletEurCents,
    added: total,
    bonus: pack.bonus,
    paid: { amount: tier.amount, currency: tier.currency },
    packTitle: pack.title,
    transaction: {
      id: createdTx?.id || `tx_${Date.now()}`,
      delta: total,
      amountEurCents: eurPaidCents,
      label: `Achat : ${pack.title} (+${total} Vibes)`,
      emoji: "💎",
      date: "À l’instant",
    },
  });
}
