// GET  /api/vibe/wallet/withdraw — list user's withdrawal requests
// POST /api/vibe/wallet/withdraw — create a withdrawal request
//
// POST accepte {amountCents, method:"mobile_money"|"stripe",
// operator?:"CM_OM"|"CM_MOMO", accountInfo?} :
//   • mobile_money + My-CoolPay configuré (clé privée + autoPayout ON) →
//     PAYOUT AUTOMATIQUE : conversion €→XAF, Withdrawal "processing"
//     (provider mycoolpay) puis createPayout. Échec API → transaction de
//     compensation (wallet re-crédité, retrait "rejected", 402).
//   • sinon (stripe, ou mobile_money sans clé privée / autoPayout OFF) →
//     comportement historique : retrait "pending" traité à la main par
//     l'admin (provider "manual").
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { getSettings } from "@/lib/vibe/settings";
import {
  createPayout,
  eurCentsToXaf,
  getPayConfig,
  makeAppRef,
  toLocalCmPhone,
  type PayoutOperator,
} from "@/lib/vibe/mycoolpay";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const withdrawals = await db.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { amountCents, method, operator, accountInfo } = await req.json().catch(() => ({} as any));
  if (!amountCents || amountCents < 1) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const { withdrawalThresholdEur } = await getSettings();
  const thresholdCents = withdrawalThresholdEur * 100;

  if (amountCents < thresholdCents) {
    return NextResponse.json(
      { error: `Montant minimum: ${withdrawalThresholdEur}€` },
      { status: 400 }
    );
  }

  if (amountCents > user.walletEurCents) {
    return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  // ── Payout automatique Mobile Money (My-CoolPay) ────────────────────────
  const cfg = await getPayConfig();
  if (method === "mobile_money" && cfg.enabled && cfg.privateKey && cfg.autoPayout) {
    if (operator !== "CM_OM" && operator !== "CM_MOMO") {
      return NextResponse.json({ error: "Choisis ton opérateur Mobile Money" }, { status: 400 });
    }
    // Numéro bénéficiaire au format local opérateur (6XXXXXXXX).
    const mmPhone = toLocalCmPhone(String(accountInfo ?? ""));
    if (!/^6\d{8}$/.test(mmPhone)) {
      return NextResponse.json({ error: "Numéro Mobile Money invalide (6XXXXXXXX)" }, { status: 400 });
    }

    // Conversion EUR (cents) → XAF, arrondie au multiple de 5 supérieur pour
    // éviter les montants impossibles chez les opérateurs Mobile Money.
    const rawXaf = await eurCentsToXaf(amountCents);
    const amountXaf = Math.ceil(rawXaf / 5) * 5;

    const appRef = makeAppRef("wd");

    // Débit immédiat (séquestre) + Withdrawal "processing" en une transaction.
    const created = await db.$transaction(
      async (tx) => {
        const w = await tx.withdrawal.create({
          data: {
            userId: user.id,
            amountCents,
            status: "processing",
            method: "mobile_money",
            operator: operator as PayoutOperator,
            provider: "mycoolpay",
            appRef,
            accountInfo: mmPhone,
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { walletEurCents: { decrement: amountCents } },
        });
        return w;
      },
      { timeout: 15_000 }
    );

    const payout = await createPayout(cfg, {
      amount: amountXaf,
      currency: "XAF",
      reason: "Retrait gains Tiluu",
      operator: operator as PayoutOperator,
      appRef,
      customerName: user.profile?.displayName || user.name || "Client Tiluu",
      customerPhone: mmPhone,
    });

    if (payout.ok) {
      // done=true → 200 "Successful" (exécuté) ; sinon 202 "in progress" →
      // reste "processing", le callback / la synchro admin compléteront.
      const withdrawal = await db.withdrawal.update({
        where: { id: created.id },
        data: {
          providerRef: payout.transactionRef,
          status: payout.done ? "completed" : "processing",
          processedAt: payout.done ? new Date() : null,
        },
      });
      const updated = await db.user.findUnique({
        where: { id: user.id },
        select: { walletEurCents: true },
      });
      return NextResponse.json({
        ok: true,
        auto: true,
        walletEurCents: updated?.walletEurCents ?? user.walletEurCents - amountCents,
        withdrawal,
      });
    }

    // Échec payout → transaction de compensation : le retrait est refusé et
    // le portefeuille re-crédité (aucun gain ne disparaît).
    await db.$transaction(
      async (tx) => {
        await tx.withdrawal.update({
          where: { id: created.id },
          data: { status: "rejected", failureReason: payout.error },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { walletEurCents: { increment: amountCents } },
        });
      },
      { timeout: 15_000 }
    );
    return NextResponse.json(
      { error: "Le transfert Mobile Money a échoué. Tes gains restent sur ton portefeuille." },
      { status: 402 }
    );
  }

  // ── Chemin manuel (stripe, ou mobile_money sans payout auto) ────────────
  // Déduction immédiate (séquestre jusqu'au traitement admin).
  await db.$transaction(async (tx) => {
    await tx.withdrawal.create({
      data: {
        userId: user.id,
        amountCents,
        status: "pending",
        method: method || "stripe",
        provider: "manual",
        operator: operator || null,
        accountInfo: accountInfo || null,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { walletEurCents: { decrement: amountCents } },
    });
  });

  const updated = await db.user.findUnique({
    where: { id: user.id },
    select: { walletEurCents: true },
  });

  return NextResponse.json({
    ok: true,
    walletEurCents: updated?.walletEurCents ?? user.walletEurCents,
  });
}
