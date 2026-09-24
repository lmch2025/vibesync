// POST /api/vibe/pay/initiate — lancer l'achat d'un pack de Vibes.
// Deux modes, décidés par la config My-CoolPay (getPayConfig) :
//   • mode "off" (cfg.enabled === false) → MOCK : crédit immédiat, réponse
//     identique à l'ancien /api/vibe/gems/purchase + mode:"mock" (démo jouable
//     sans prestataire de paiement).
//   • sandbox/live → RÉEL : on crée d'abord une ligne PaymentTx "pending",
//     puis on demande un paylink à My-CoolPay. Le client est redirigé vers
//     paymentUrl (checkout hébergé) ; le crédit est confirmé plus tard par le
//     callback (/api/vibe/pay/callback/[secret]) ou le polling de statut
//     (/api/vibe/pay/status) — jamais par ce endpoint.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GEM_PACKS } from "@/lib/vibe/constants";
import { createPaylink, getPayConfig, makeAppRef, toLocalCmPhone } from "@/lib/vibe/mycoolpay";
import { tFor } from "@/lib/vibe/i18n/server";
import { isValidLang, type Lang } from "@/lib/vibe/i18n/core";

// Anti double-clic : un paiement en cours de moins de 30 s bloque.
const PENDING_COOLDOWN_MS = 30_000;

export async function POST(req: Request) {
  // Auth stricte : l'achat doit être attribué au vrai utilisateur de session.
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const { packId, currency } = body;
  const pack = GEM_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pack inconnu" }, { status: 400 });

  const cfg = await getPayConfig();
  const lang: Lang = isValidLang(user.lang) ? (user.lang as Lang) : "fr";

  // ── MODE MOCK (payMode "off") — comportement de l'ancien /gems/purchase ──
  if (!cfg.enabled) {
    const tier = pack.tiers.find((t) => t.currency === currency) ?? pack.tiers[0];
    const total = pack.gems + pack.bonus;
    const eurPaidCents = Math.round(tier.amount * 100);

    let createdTx: any = null;
    // timeout étendu : les pics de latence Neon (>5 s par défaut) font expirer
    // la transaction interactive (P2028) alors que les écritures sont légères.
    await db.$transaction(
      async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { gems: { increment: total } } });
        createdTx = await tx.gemTx.create({
          data: { userId: user.id, delta: total, reason: "purchase", eurPaidCents },
        });
        // Notification localisée (même pattern que l'ancien achat simulé).
        await tx.notification.create({
          data: {
            userId: user.id,
            type: "system",
            title: tFor(lang, "pay.notifPurchase.title", { n: total }),
            body: tFor(lang, "pay.notifPurchase.body", { n: total, pack: pack.title }),
            icon: "💎",
            actionUrl: "/wallet",
          },
        });
      },
      { timeout: 15_000 }
    );

    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: { gems: true, freeGems: true, walletEurCents: true },
    });

    return NextResponse.json({
      ok: true,
      mode: "mock",
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

  // ── MODE RÉEL (My-CoolPay sandbox/live) ─────────────────────────────────
  // Garde-fou anti double-clic / double-init : un PaymentTx "pending" de
  // moins de 30 s pour ce utilisateur bloque toute nouvelle initiation.
  const recentPending = await db.paymentTx.findFirst({
    where: {
      userId: user.id,
      status: "pending",
      createdAt: { gte: new Date(Date.now() - PENDING_COOLDOWN_MS) },
    },
    select: { id: true },
  });
  if (recentPending) {
    return NextResponse.json({ error: "Un paiement est déjà en cours" }, { status: 409 });
  }

  // Palier de prix dans la devise de facturation configurée (XAF ou EUR).
  const tier = pack.tiers.find((t) => t.currency === cfg.currency) ?? pack.tiers[0];
  // Prix normalisé en centimes d'€ (palier EUR), quelle que soit la devise de
  // facturation — sert au wallet/revenus et reste comparable dans le temps.
  const eurTier = pack.tiers.find((t) => t.currency === "EUR");
  const eurPaidCents = Math.round((eurTier?.amount ?? tier.amount) * 100);

  const appRef = makeAppRef("pay");
  const reason = `${pack.title} — Tiluu Vibes`;
  const customerPhone = toLocalCmPhone(user.phone); // format local 6XXXXXXXX
  const customerName = user.profile?.displayName || user.name || "Client Tiluu";

  // 1) PaymentTx d'abord : même si le paylink échoue, la trace existe.
  const payment = await db.paymentTx.create({
    data: {
      userId: user.id,
      kind: "gem_pack",
      packId: pack.id,
      gems: pack.gems + pack.bonus,
      bonus: pack.bonus,
      packTitle: pack.title,
      amount: tier.amount,
      currency: cfg.currency,
      eurPaidCents,
      provider: "mycoolpay",
      appRef,
      reason,
      phone: customerPhone,
      status: "pending",
    },
    select: { id: true },
  });

  // 2) Paylink — returnUrlParam=appRef est répercuté par My-CoolPay sur l'URL
  //    de redirection configurée (?ref=tiluu_pay_…) → l'app retrouve le
  //    paiement au retour et poll /api/vibe/pay/status.
  const link = await createPaylink(cfg, {
    amount: tier.amount,
    currency: cfg.currency,
    reason,
    appRef,
    customerName,
    customerPhone,
    customerLang: lang,
    returnUrlParam: appRef,
  });

  if (link.ok) {
    await db.paymentTx.update({
      where: { id: payment.id },
      data: { providerRef: link.transactionRef, paymentUrl: link.paymentUrl },
    });
    return NextResponse.json({
      ok: true,
      mode: "mycoolpay",
      paymentUrl: link.paymentUrl,
      appRef,
    });
  }

  // Paylink refusé → la transaction est marquée échouée (jamais créditée).
  await db.paymentTx.update({ where: { id: payment.id }, data: { status: "failed" } });
  return NextResponse.json(
    { error: "Le prestataire de paiement est indisponible. Réessaie dans un instant." },
    { status: 502 }
  );
}
