// Crédit idempotent d'un achat My-CoolPay (PaymentTx → Vibes).
// Partagé entre : le callback provider (/api/vibe/pay/callback/[secret]),
// le polling de statut (/api/vibe/pay/status) et la synchro admin.
//
// Idempotence : le verrou atomique est la requête
//   UPDATE payment_tx SET credited = true WHERE id = ? AND credited = false
// (updateMany → count). Si quelqu'un d'autre (callback OU polling) a déjà
// crédité, count === 0 → on ne touche à rien et on renvoie null.
// Le crédit lui-même écrit un GemTx raison "purchase" (historique unifié)
// + une notification localisée dans la langue du compte du bénéficiaire.
import { Prisma } from "@prisma/client";
import { tFor } from "@/lib/vibe/i18n/server";
import { isValidLang, type Lang } from "@/lib/vibe/i18n/core";

export type UserBalances = { gems: number; freeGems: number; walletEurCents: number };

/// Crédite un PaymentTx payé. `tx` = client de transaction OU `db` direct.
/// Renvoie les soldes frais de l'utilisateur, ou null si le paiement
/// n'existe pas / a déjà été crédité.
export async function creditPaymentTx(
  tx: Prisma.TransactionClient,
  paymentId: string
): Promise<UserBalances | null> {
  const payment = await tx.paymentTx.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, gems: true, packTitle: true, eurPaidCents: true },
  });
  if (!payment) return null;

  // Verrou atomique — le premier qui passe crédite, les autres s'inclinent.
  const claim = await tx.paymentTx.updateMany({
    where: { id: payment.id, credited: false },
    data: { credited: true, status: "success" },
  });
  if (claim.count === 0) return null;

  // Les Vibes achetées incrémentent `gems` uniquement (utilisables pour les
  // cadeaux), jamais `freeGems` — même règle que l'ancien /gems/purchase.
  await tx.user.update({
    where: { id: payment.userId },
    data: { gems: { increment: payment.gems } },
  });
  await tx.gemTx.create({
    data: {
      userId: payment.userId,
      delta: payment.gems,
      reason: "purchase",
      eurPaidCents: payment.eurPaidCents,
    },
  });

  // Notification bilingue — langue du compte du bénéficiaire (User.lang).
  const owner = await tx.user.findUnique({
    where: { id: payment.userId },
    select: { lang: true },
  });
  const lang: Lang = isValidLang(owner?.lang) ? (owner!.lang as Lang) : "fr";
  await tx.notification.create({
    data: {
      userId: payment.userId,
      type: "system",
      title: tFor(lang, "pay.notifPurchase.title", { n: payment.gems }),
      body: tFor(lang, "pay.notifPurchase.body", { n: payment.gems, pack: payment.packTitle ?? "" }),
      icon: "💎",
      actionUrl: "/wallet",
    },
  });

  const fresh = await tx.user.findUnique({
    where: { id: payment.userId },
    select: { gems: true, freeGems: true, walletEurCents: true },
  });
  return fresh
    ? { gems: fresh.gems, freeGems: fresh.freeGems, walletEurCents: fresh.walletEurCents }
    : null;
}
