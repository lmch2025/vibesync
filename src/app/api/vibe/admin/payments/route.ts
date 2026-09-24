// GET /api/vibe/admin/payments — config My-CoolPay + solde marchand + stats
// PUT /api/vibe/admin/payments — mise à jour de la config (clés, mode, devise,
//                                IP-check, auto-payout, secret callback)
//
// PUT : privateKey "" (absente) = CONSERVER la clé existante (jamais
// d'effacement accidentel) ; valeur spéciale "__CLEAR__" = effacer.
// Après écriture : refreshSettings() puis même réponse que GET.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { refreshSettings } from "@/lib/vibe/settings";
import {
  generateCallbackSecret,
  getMerchantBalance,
  getPayConfig,
  ensureCallbackSecret,
} from "@/lib/vibe/mycoolpay";

/// Origin public de la requête (derrière proxy Vercel/Caddy) pour construire
/// l'URL de callback à déclarer dans le dashboard marchand My-CoolPay.
function requestOrigin(req: Request): string {
  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim() || "https";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/// Réponse complète (config effective + balance live + stats agrégées).
async function buildPaymentsResponse(req: Request): Promise<NextResponse> {
  const cfg = await getPayConfig();
  // Garantit un secret de callback (le crée au premier affichage admin).
  const secret = await ensureCallbackSecret();
  const origin = requestOrigin(req);

  // Solde marchand — nécessite la clé privée (live), sinon {ok:false, error}.
  const balance = await getMerchantBalance(cfg);

  const [
    totalCount,
    successCount,
    pendingCount,
    xafAgg,
    eurAgg,
    withdrawalsPending,
    withdrawalsProcessing,
  ] = await Promise.all([
    db.paymentTx.count(),
    db.paymentTx.count({ where: { status: "success" } }),
    db.paymentTx.count({ where: { status: "pending" } }),
    db.paymentTx.aggregate({ where: { currency: "XAF" }, _sum: { amount: true } }),
    db.paymentTx.aggregate({ where: { status: "success" }, _sum: { eurPaidCents: true } }),
    db.withdrawal.count({ where: { status: "pending" } }),
    db.withdrawal.count({ where: { status: "processing" } }),
  ]);

  return NextResponse.json({
    config: {
      mode: cfg.mode,
      publicKey: cfg.publicKey, // clé effective (sandbox par défaut en sandbox)
      privateKeyMasked: cfg.privateKey ? "••••••••" : "",
      hasPrivateKey: !!cfg.privateKey,
      payCurrency: cfg.currency,
      ipCheck: cfg.ipCheck,
      autoPayout: cfg.autoPayout,
      callbackSecret: secret,
      callbackUrl: `${origin}/api/vibe/pay/callback/${secret}`,
    },
    balance,
    stats: {
      count: totalCount,
      successCount,
      pendingCount,
      volumeXaf: xafAgg._sum.amount ?? 0,
      volumeEurCents: eurAgg._sum.eurPaidCents ?? 0,
      withdrawalsPending,
      withdrawalsProcessing,
    },
  });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return buildPaymentsResponse(req);
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const entries: [string, string][] = [];

  if (body.mode !== undefined) {
    if (!["sandbox", "live", "off"].includes(body.mode)) {
      return NextResponse.json({ error: "Mode invalide" }, { status: 400 });
    }
    entries.push(["payMode", String(body.mode)]);
  }
  if (typeof body.publicKey === "string") {
    entries.push(["payPublicKey", body.publicKey.trim()]);
  }
  if (typeof body.privateKey === "string" && body.privateKey !== "") {
    // "" = conserver l'existante ; "__CLEAR__" = effacement explicite.
    entries.push(["payPrivateKey", body.privateKey === "__CLEAR__" ? "" : body.privateKey.trim()]);
  }
  if (body.payCurrency !== undefined) {
    if (body.payCurrency !== "XAF" && body.payCurrency !== "EUR") {
      return NextResponse.json({ error: "Devise invalide" }, { status: 400 });
    }
    entries.push(["payCurrency", body.payCurrency]);
  }
  if (body.ipCheck !== undefined) {
    entries.push(["payIpCheck", body.ipCheck ? "on" : "off"]);
  }
  if (body.autoPayout !== undefined) {
    entries.push(["payAutoPayout", body.autoPayout ? "on" : "off"]);
  }
  if (body.regenerateSecret) {
    entries.push(["payCallbackSecret", generateCallbackSecret()]);
  }

  for (const [key, value] of entries) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  refreshSettings();

  return buildPaymentsResponse(req);
}
