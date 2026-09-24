// POST /api/vibe/pay/callback/[secret] — webhook My-CoolPay (SANS auth).
// L'agrégateur POSTe ici le résultat d'une transaction (PAYIN achat / PAYOUT
// retrait), UNE SEULE FOIS (pas de retry — le polling /pay/status et la synchro
// admin servent de filet de sécurité).
//
// Contrat documenté My-CoolPay : répondre "OK" (texte brut) si le callback est
// authentique, "KO" sinon. Vérifications dans l'ordre :
//   1. secret URL === Setting payCallbackSecret       → sinon "KO" 403
//   2. IP source === 15.236.140.89 (si payIpCheck on) → sinon "KO" 403
//   3. signature MD5 (ref+type+amount+currency+operator+privateKey)
//      — ignorée en sandbox sans clé privée (skip)   → sinon "KO" 401
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ensureCallbackSecret,
  extractClientIp,
  getPayConfig,
  isMyCoolPayIp,
  mapProviderStatus,
  verifyCallbackSignature,
  type McpCallbackPayload,
} from "@/lib/vibe/mycoolpay";
import { creditPaymentTx } from "@/lib/vibe/pay-credit";

/// Réponse texte brut — contrat My-CoolPay ("OK" / "KO", jamais du JSON).
function reply(body: "OK" | "KO", status: number): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;

  // Payload brut (la signature porte sur les valeurs, pas l'enveloppe HTTP).
  let payload: McpCallbackPayload;
  try {
    payload = JSON.parse(await req.text()) as McpCallbackPayload;
  } catch {
    return reply("KO", 400);
  }

  const cfg = await getPayConfig();
  // Garantit l'existence d'un secret (créé si absent) — la requête courante ne
  // peut évidemment pas correspondre à un secret fraîchement généré.
  const callbackSecret = cfg.callbackSecret || (await ensureCallbackSecret());

  // 1) Secret d'URL
  if (!secret || secret !== callbackSecret) return reply("KO", 403);

  // 2) IP source (optionnel — derrière proxy, x-forwarded-for)
  if (cfg.ipCheck && !isMyCoolPayIp(extractClientIp(req))) return reply("KO", 403);

  // 3) Signature MD5 (skippée en sandbox sans clé privée → verified=true)
  const { verified } = verifyCallbackSignature(cfg, payload);
  if (!verified) return reply("KO", 401);

  const mapped = mapProviderStatus(payload.transaction_status ?? "");
  const appRef = payload.app_transaction_ref || undefined;
  const providerRef = payload.transaction_ref || undefined;

  // ── PAYOUT — retrait Mobile Money ───────────────────────────────────────
  if (payload.transaction_type === "PAYOUT") {
    const conditions: Prisma.WithdrawalWhereInput[] = [];
    if (appRef) conditions.push({ appRef });
    if (providerRef) conditions.push({ providerRef });
    const withdrawal =
      conditions.length > 0
        ? await db.withdrawal.findFirst({ where: { OR: conditions } })
        : null;

    if (!withdrawal) {
      console.warn("[mycoolpay-callback] PAYOUT inconnu:", appRef ?? providerRef ?? "réf. absente");
      return reply("OK", 200); // acquitté quand même (réception confirmée)
    }

    if (mapped === "success") {
      await db.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "completed",
          processedAt: new Date(),
          ...(withdrawal.providerRef ? {} : { providerRef: providerRef ?? null }),
          ...(payload.transaction_fees != null ? { fees: Number(payload.transaction_fees) } : {}),
        },
      });
    } else if (mapped === "failed" || mapped === "canceled") {
      await db.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "failed",
          failureReason: payload.transaction_message || "Payout refusé par l'opérateur",
          ...(withdrawal.providerRef ? {} : { providerRef: providerRef ?? null }),
        },
      });
    }
    return reply("OK", 200);
  }

  // ── PAYIN (défaut) — achat de Vibes ─────────────────────────────────────
  const payConditions: Prisma.PaymentTxWhereInput[] = [];
  if (appRef) payConditions.push({ appRef });
  if (providerRef) payConditions.push({ providerRef });
  const payment =
    payConditions.length > 0
      ? await db.paymentTx.findFirst({ where: { OR: payConditions } })
      : null;

  if (!payment) {
    console.warn("[mycoolpay-callback] PAYIN inconnu:", appRef ?? providerRef ?? "réf. absente");
    return reply("OK", 200); // acquitté quand même (réception confirmée)
  }

  const meta = {
    operator: payload.transaction_operator || null,
    fees: payload.transaction_fees != null ? Number(payload.transaction_fees) : null,
    callbackAt: new Date(),
    raw: payload as unknown as Prisma.InputJsonValue,
    ...(payment.providerRef ? {} : { providerRef: providerRef ?? null }),
  };

  if (mapped === "success") {
    // Mise à jour provider + crédit idempotent (verrou credited) en une
    // transaction — le polling /pay/status qui arrive en second ne re-crédite pas.
    await db.$transaction(
      async (tx) => {
        await tx.paymentTx.update({ where: { id: payment.id }, data: { status: "success", ...meta } });
        await creditPaymentTx(tx, payment.id);
      },
      { timeout: 15_000 }
    );
  } else {
    // canceled / failed / pending intermédiaire — trace du callback conservée.
    await db.paymentTx.update({ where: { id: payment.id }, data: { status: mapped, ...meta } });
  }
  return reply("OK", 200);
}
