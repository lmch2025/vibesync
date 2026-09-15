// GET /api/vibe/wallet/transactions — full transaction history for the user.
// Returns both Vibes transactions (GemTx) and gift transactions (GiftTx)
// merged and ordered by date (most recent first).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { useCurrency } from "@/lib/vibe/use-currency";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [gemTx, giftTx, withdrawals] = await Promise.all([
    db.gemTx.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.giftTx.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      include: { gift: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  type Tx = {
    id: string;
    type: "vibe_purchase" | "vibe_spend" | "gift_sent" | "gift_received" | "withdrawal";
    label: string;
    delta: number; // + or - for Vibes
    amountEurCents: number | null; // for gifts / withdrawals
    emoji: string;
    createdAt: string;
    status?: string;
  };

  const txs: Tx[] = [];

  for (const t of gemTx) {
    if (t.reason === "gift") continue;
    const isPurchase = t.reason === "purchase" || t.reason === "welcome";
    const labels: Record<string, string> = {
      purchase: "Achat de Vibes",
      welcome: "Bonus de bienvenue",
      superlike: "Super-Like",
      boost: "Boost de profil",
      gift: "Cadeau envoyé",
      rewind: "Rewind",
      passport: "Passport",
      icebreaker: "Icebreaker IA",
      see_likes: "Voir les likes",
      seeLikes: "Voir les likes",
      message_boost: "Boost de message",
      messageBoost: "Boost de message",
      spotlight: "Projecteur",
      superRewind: "Super Rewind",
      vibeRadar: "Vibe Radar",
      crushAlert: "Crush Alert",
      goldenHeart: "Cœur d'Or",
      timeFreeze: "Temps Gelé",
      compatibilityReport: "Rapport de Compatibilité",
      moodRing: "Anneau d'Humeur",
      ghostMode: "Mode Fantôme",
      dailyDouble: "Double Quotidien",
      streak_reward: "Série quotidienne (Streak)",
    };
    txs.push({
      id: t.id,
      type: isPurchase ? "vibe_purchase" : "vibe_spend",
      label: labels[t.reason] || t.reason,
      delta: t.delta,
      amountEurCents: t.eurPaidCents,
      emoji: isPurchase ? "💎" : t.reason === "gift" ? "🎁" : "⚡",
      createdAt: t.createdAt.toISOString(),
    });
  }

  for (const g of giftTx) {
    const isSender = g.senderId === user.id;
    txs.push({
      id: g.id,
      type: isSender ? "gift_sent" : "gift_received",
      label: `${g.gift.emoji} ${g.gift.name} ${isSender ? "envoyé" : "reçu"}`,
      delta: isSender ? -g.gift.gemCost : 0,
      amountEurCents: isSender ? null : Math.round(g.gift.eurValueCents * 0.7),
      emoji: g.gift.emoji,
      createdAt: g.createdAt.toISOString(),
    });
  }

  for (const w of withdrawals) {
    txs.push({
      id: w.id,
      type: "withdrawal",
      label: "Retrait vers banque",
      delta: 0,
      amountEurCents: -w.amountCents,
      emoji: "💸",
      createdAt: w.createdAt.toISOString(),
      status: w.status,
    });
  }

  txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ transactions: txs.slice(0, 50) });
}
