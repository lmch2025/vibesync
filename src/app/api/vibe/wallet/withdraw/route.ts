// GET  /api/vibe/wallet/withdraw — list user's withdrawal requests
// POST /api/vibe/wallet/withdraw — create a withdrawal request
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { getSettings } from "@/lib/vibe/settings";

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

  const { amountCents, method, accountInfo } = await req.json().catch(() => ({} as any));
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

  // Deduct the amount immediately (held in escrow until processing).
  await db.$transaction(async (tx) => {
    await tx.withdrawal.create({
      data: {
        userId: user.id,
        amountCents,
        status: "pending",
        method: method || "stripe",
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
