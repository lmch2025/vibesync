// GET /api/vibe/wallet/transactions — full Vibes history for the user.
// Returns EVERY operation concerning Vibes, merged and ordered by date
// (most recent first):
//   • Achats de Vibes (avec le montant payé en €)
//   • Toutes les dépenses d'actions premium (superlike, boost, rewind,
//     passport, icebreaker, seeLikes, messageBoost, spotlight, superRewind,
//     vibeRadar, crushAlert, goldenHeart, timeFreeze, compatibilityReport,
//     moodRing, ghostMode, dailyDouble…)
//   • Cadeaux envoyés / reçus (avec la valeur € créditée au destinataire)
//   • Bonus & récompenses (bienvenue, série quotidienne/streak, parrainage)
//   • Retraits vers la banque (avec statut)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [gemTx, giftTx, withdrawals] = await Promise.all([
    db.gemTx.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    db.giftTx.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      include: { gift: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  type Tx = {
    id: string;
    type:
      | "vibe_purchase"    // Vibes achetées (€ payés)
      | "vibe_spend"       // Vibes dépensées (action premium)
      | "vibe_reward"      // Vibes gagnées (streak, bienvenue, parrainage)
      | "gift_sent"        // Cadeau envoyé (Vibes dépensées)
      | "gift_received"    // Cadeau reçu (€ crédités)
      | "withdrawal";      // Retrait bancaire (€)
    label: string;
    delta: number;               // + / − en Vibes
    amountEurCents: number | null; // € : payé (achat) / crédité (cadeau reçu) / retiré
    emoji: string;
    createdAt: string;
    status?: string;
  };

  // Libellés complets de TOUTES les raisons GemTx possibles.
  const LABELS: Record<string, string> = {
    // Achats & bonus
    purchase: "Achat de Vibes",
    welcome: "Bonus de bienvenue",
    streak_reward: "Série quotidienne (Streak)",
    referral: "Bonus de parrainage",
    // Actions premium (dépenses)
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
  };

  // Raisons considérées comme des GAINS de Vibes (hors achat).
  const REWARDS = new Set(["welcome", "streak_reward", "referral"]);

  const txs: Tx[] = [];

  for (const t of gemTx) {
    // Les cadeaux envoyés sont représentés par la GiftTx correspondante
    // (libellé enrichi + valeur €) — on évite le doublon ici.
    if (t.reason === "gift") continue;
    const isPurchase = t.reason === "purchase";
    const isReward = REWARDS.has(t.reason);
    const emoji = isPurchase ? "💎"
      : isReward ? (t.reason === "streak_reward" ? "🔥" : "🎁")
      : "⚡";
    txs.push({
      id: t.id,
      type: isPurchase ? "vibe_purchase" : isReward ? "vibe_reward" : "vibe_spend",
      label: LABELS[t.reason] || t.reason,
      delta: t.delta,
      amountEurCents: t.eurPaidCents,
      emoji,
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
      // Le destinataire touche la part après commission de la plateforme.
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

  return NextResponse.json({ transactions: txs.slice(0, 200) });
}
