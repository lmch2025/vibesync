// GET /api/vibe/pay/status?appRef=tiluu_pay_xxx — statut d'un paiement
// (appelé en polling par l'overlay de retour de paiement côté client).
// Sécurité : le paiement DOIT appartenir à l'utilisateur de session (sinon
// 404 — on ne révèle même pas l'existence d'un paiement d'autrui).
// Filet de sécurité : le callback My-CoolPay n'est envoyé qu'UNE seule fois
// (pas de retry) — ce endpoint interroge checkStatus chez le provider et
// crédite idempotemment si SUCCESS (voir lib/vibe/pay-credit).
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { checkTransactionStatus, getPayConfig, mapProviderStatus } from "@/lib/vibe/mycoolpay";
import { creditPaymentTx } from "@/lib/vibe/pay-credit";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const appRef = new URL(req.url).searchParams.get("appRef") ?? "";
  const payment = await db.paymentTx.findUnique({ where: { appRef } });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  const cfg = await getPayConfig();

  // Paiement en cours → réinterroger le provider (sauf mode off/mock).
  if (payment.status === "pending" && cfg.enabled && payment.providerRef) {
    const res = await checkTransactionStatus(cfg, payment.providerRef);
    if (res.ok && res.tx) {
      const mapped = mapProviderStatus(res.tx.transactionStatus);
      const meta = {
        operator: res.tx.transactionOperator,
        fees: res.tx.transactionFees,
        lastCheckedAt: new Date(),
        raw: res.tx as unknown as Prisma.InputJsonValue,
      };
      if (mapped === "success") {
        // Mise à jour provider + crédit idempotent dans UNE transaction —
        // si le callback est déjà passé, creditPaymentTx ne fait rien.
        await db.$transaction(
          async (tx) => {
            await tx.paymentTx.update({ where: { id: payment.id }, data: { status: "success", ...meta } });
            await creditPaymentTx(tx, payment.id);
          },
          { timeout: 15_000 }
        );
      } else {
        // pending (encore en validation) / canceled / failed — pas de crédit.
        await db.paymentTx.update({ where: { id: payment.id }, data: { status: mapped, ...meta } });
      }
    } else {
      // Provider injoignable — on enregistre juste la tentative de polling.
      await db.paymentTx.update({
        where: { id: payment.id },
        data: { lastCheckedAt: new Date() },
      });
    }
  }

  const fresh = await db.paymentTx.findUnique({
    where: { appRef },
    select: { status: true, credited: true, gems: true, packTitle: true, amount: true, currency: true },
  });
  const success = fresh?.status === "success";

  // Soldes frais uniquement au succès — le client patchMe() dessus.
  let balances: { gems: number; freeGems: number; walletEurCents: number } | null = null;
  if (success) {
    const u = await db.user.findUnique({
      where: { id: user.id },
      select: { gems: true, freeGems: true, walletEurCents: true },
    });
    balances = u
      ? { gems: u.gems, freeGems: u.freeGems, walletEurCents: u.walletEurCents }
      : null;
  }

  return NextResponse.json({
    ok: true,
    status: fresh?.status ?? payment.status,
    credited: fresh?.credited ?? payment.credited,
    mode: cfg.mode,
    packTitle: fresh?.packTitle ?? payment.packTitle,
    amount: fresh?.amount ?? payment.amount,
    currency: fresh?.currency ?? payment.currency,
    ...(success && fresh
      ? {
          added: fresh.gems,
          ...(balances ?? {}),
        }
      : {}),
  });
}
