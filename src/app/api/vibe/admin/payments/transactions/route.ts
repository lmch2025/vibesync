// GET  /api/vibe/admin/payments/transactions?tab=payments|withdrawals&status=&limit=50
//        — liste des transactions de paiement (PaymentTx) ou des retraits
//          (Withdrawal), téléphones masqués comme /api/vibe/admin/users.
// POST /api/vibe/admin/payments/transactions — actions admin :
//   {action:"sync_payment", id}          → réinterroge My-CoolPay (checkStatus)
//                                          et crédite si SUCCESS (idempotent)
//   {action:"sync_withdrawal", id}       → idem pour un payout Mobile Money
//   {action:"complete_withdrawal", id}   → marque un retrait manuel complété
//   {action:"reject_withdrawal", id, reason?} → refuse + rembourse le wallet
//                                          (transaction atomique, anti double)
import { NextResponse } from "next/server";
import type { PaymentTx, Withdrawal } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { checkTransactionStatus, getPayConfig, mapProviderStatus } from "@/lib/vibe/mycoolpay";
import { creditPaymentTx } from "@/lib/vibe/pay-credit";

/// Relation utilisateur incluse dans les requêtes (téléphone + pseudo).
type WithUser<T> = T & {
  user: {
    phone: string;
    name: string | null;
    profile: { displayName: string } | null;
  };
};

const WITH_USER = {
  user: { select: { phone: true, name: true, profile: { select: { displayName: true } } } },
} as const;

/// Masque un téléphone comme la liste admin utilisateurs (ex. 69•••••51).
function maskPhone(phone: string): string {
  return phone.replace(/(\d{2})\d+(\d{2})/, "$1•••••$2");
}

/// Masque partiellement une info de compte (numéro Mobile Money…).
function maskAccount(info: string | null): string | null {
  if (!info) return null;
  if (info.length <= 4) return "••••";
  return `${info.slice(0, 2)}•••••${info.slice(-2)}`;
}

/// Sérialisation PaymentTx → réponse admin (téléphone masqué).
function serializePayment(p: WithUser<PaymentTx>) {
  return {
    id: p.id,
    appRef: p.appRef,
    providerRef: p.providerRef,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    operator: p.operator,
    fees: p.fees,
    gems: p.gems,
    packId: p.packId,
    packTitle: p.packTitle,
    credited: p.credited,
    createdAt: p.createdAt,
    paymentUrl: p.paymentUrl,
    user: {
      phone: maskPhone(p.user.phone ?? ""),
      displayName: p.user.profile?.displayName ?? p.user.name ?? null,
    },
  };
}

/// Sérialisation Withdrawal → réponse admin (compte + téléphone masqués).
function serializeWithdrawal(w: WithUser<Withdrawal>) {
  return {
    id: w.id,
    amountCents: w.amountCents,
    status: w.status,
    method: w.method,
    operator: w.operator,
    provider: w.provider,
    providerRef: w.providerRef,
    accountInfo: maskAccount(w.accountInfo),
    failureReason: w.failureReason,
    createdAt: w.createdAt,
    processedAt: w.processedAt,
    user: {
      phone: maskPhone(w.user.phone ?? ""),
      displayName: w.user.profile?.displayName ?? w.user.name ?? null,
    },
  };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "payments";
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  if (tab === "withdrawals") {
    const withdrawals = await db.withdrawal.findMany({
      where: status ? { status } : undefined,
      include: WITH_USER,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ withdrawals: withdrawals.map(serializeWithdrawal) });
  }

  const payments = await db.paymentTx.findMany({
    where: status ? { status } : undefined,
    include: WITH_USER,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ payments: payments.map(serializePayment) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { action, id, reason } = await req.json().catch(() => ({} as any));
  if (!id) return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });

  const cfg = await getPayConfig();

  // ── sync_payment : réinterroger le provider et créditer si SUCCESS ──────
  if (action === "sync_payment") {
    const payment = await db.paymentTx.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });

    if (payment.status === "pending" && payment.providerRef && cfg.enabled) {
      const res = await checkTransactionStatus(cfg, payment.providerRef);
      if (res.ok && res.tx) {
        const mapped = mapProviderStatus(res.tx.transactionStatus);
        if (mapped === "success") {
          await db.$transaction(
            async (tx) => {
              await tx.paymentTx.update({
                where: { id: payment.id },
                data: {
                  status: "success",
                  operator: res.tx!.transactionOperator,
                  fees: res.tx!.transactionFees,
                  lastCheckedAt: new Date(),
                },
              });
              await creditPaymentTx(tx, payment.id);
            },
            { timeout: 15_000 }
          );
        } else if (mapped !== "pending") {
          await db.paymentTx.update({
            where: { id: payment.id },
            data: {
              status: mapped,
              operator: res.tx.transactionOperator,
              fees: res.tx.transactionFees,
              lastCheckedAt: new Date(),
            },
          });
        } else {
          await db.paymentTx.update({
            where: { id: payment.id },
            data: { lastCheckedAt: new Date() },
          });
        }
      }
    }

    const fresh = await db.paymentTx.findUnique({ where: { id }, include: WITH_USER });
    return NextResponse.json({ ok: true, payment: fresh ? serializePayment(fresh) : null });
  }

  // ── sync_withdrawal : réinterroger un payout My-CoolPay ─────────────────
  if (action === "sync_withdrawal") {
    const withdrawal = await db.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return NextResponse.json({ error: "Retrait introuvable" }, { status: 404 });

    if (withdrawal.provider === "mycoolpay" && withdrawal.providerRef && cfg.enabled) {
      const res = await checkTransactionStatus(cfg, withdrawal.providerRef);
      if (res.ok && res.tx) {
        const mapped = mapProviderStatus(res.tx.transactionStatus);
        if (mapped === "success") {
          await db.withdrawal.update({
            where: { id },
            data: { status: "completed", processedAt: new Date() },
          });
        } else if (mapped === "failed" || mapped === "canceled") {
          await db.withdrawal.update({
            where: { id },
            data: {
              status: "failed",
              failureReason: res.tx.transactionMessage || "Payout refusé par l'opérateur",
            },
          });
        }
      }
    }

    const fresh = await db.withdrawal.findUnique({ where: { id }, include: WITH_USER });
    return NextResponse.json({ ok: true, withdrawal: fresh ? serializeWithdrawal(fresh) : null });
  }

  // ── complete_withdrawal : clôture manuelle (stripe / espèces…) ──────────
  if (action === "complete_withdrawal") {
    const withdrawal = await db.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return NextResponse.json({ error: "Retrait introuvable" }, { status: 404 });

    await db.withdrawal.update({
      where: { id },
      data: { status: "completed", processedAt: new Date() },
    });
    const fresh = await db.withdrawal.findUnique({ where: { id }, include: WITH_USER });
    return NextResponse.json({ ok: true, withdrawal: fresh ? serializeWithdrawal(fresh) : null });
  }

  // ── reject_withdrawal : refus + remboursement wallet (atomique) ────────
  if (action === "reject_withdrawal") {
    const withdrawal = await db.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return NextResponse.json({ error: "Retrait introuvable" }, { status: 404 });

    await db.$transaction(
      async (tx) => {
        // Relecture fraîche DANS la transaction : un rejet déjà effectué
        // (double-clic admin) ne doit pas rembourser deux fois le wallet.
        const fresh = await tx.withdrawal.findUnique({
          where: { id },
          select: { status: true },
        });
        await tx.withdrawal.update({
          where: { id },
          data: { status: "rejected", failureReason: reason || "Refusé par l'administration" },
        });
        if (fresh && fresh.status !== "rejected") {
          await tx.user.update({
            where: { id: withdrawal.userId },
            data: { walletEurCents: { increment: withdrawal.amountCents } },
          });
        }
      },
      { timeout: 15_000 }
    );

    const fresh = await db.withdrawal.findUnique({ where: { id }, include: WITH_USER });
    return NextResponse.json({ ok: true, withdrawal: fresh ? serializeWithdrawal(fresh) : null });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
