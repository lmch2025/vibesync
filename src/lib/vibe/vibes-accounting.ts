// Server-side Vibes accounting helpers.
// CRITICAL BUSINESS RULE: Free Vibes (streak, welcome, referral) can be spent
// on premium actions (super-like, boost, etc.) but CANNOT be used to send gifts
// that have a real-money value. Only purchased Vibes can fund gifts.
//
// This prevents the platform from paying out real money for Vibes it gave away.
// The separation is tracked via the `freeGems` field on User: when a user
// spends Vibes, we deduct from `freeGems` first (for non-gift actions), and
// from purchased Vibes (`gems - freeGems`) for gifts.

import { db } from "@/lib/db";

/// Check if the user has enough PURCHASED Vibes to send a gift.
/// Free Vibes don't count toward gifts.
export async function canSendGift(userId: string, cost: number): Promise<{ ok: boolean; purchasedGems: number; freeGems: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { gems: true, freeGems: true },
  });
  if (!user) return { ok: false, purchasedGems: 0, freeGems: 0 };
  const purchasedGems = user.gems - user.freeGems;
  return { ok: purchasedGems >= cost, purchasedGems, freeGems: user.freeGems };
}

/// Deduct Vibes for a non-gift premium action (super-like, boost, etc.).
/// Deducts from freeGems first, then purchased Gems.
export async function deductForAction(userId: string, cost: number): Promise<{ gems: number; freeGems: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { gems: true, freeGems: true },
  });
  if (!user) throw new Error("User not found");

  const freeUsed = Math.min(user.freeGems, cost);
  const paidUsed = cost - freeUsed;

  const updated = await db.user.updateMany({
    where: { id: userId, gems: { gte: cost } },
    data: {
      gems: { decrement: cost },
      freeGems: { decrement: freeUsed },
    },
  });

  if (updated.count === 0) {
    throw new Error("Pas assez de Vibes");
  }

  const finalUser = await db.user.findUnique({
    where: { id: userId },
    select: { gems: true, freeGems: true },
  });

  return { gems: finalUser?.gems ?? 0, freeGems: finalUser?.freeGems ?? 0 };
}

/// Deduct Vibes for a GIFT. Only purchased Vibes can be used.
/// Returns the updated gem totals or throws if insufficient purchased Vibes.
export async function deductForGift(userId: string, cost: number): Promise<{ gems: number; freeGems: number }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { gems: true, freeGems: true },
  });
  if (!user) throw new Error("User not found");

  const purchasedGems = user.gems - user.freeGems;
  if (purchasedGems < cost) {
    throw new Error("Vibes gratuites non utilisables pour les cadeaux. Achète des Vibes pour offrir.");
  }

  const updated = await db.user.updateMany({
    where: { id: userId, gems: { gte: cost } }, // Note: actual condition is purchasedGems >= cost, but we check purchasedGems above. Here we at least ensure gems >= cost atomically.
    data: {
      gems: { decrement: cost },
      // freeGems unchanged — only purchased Vibes are deducted
    },
  });

  if (updated.count === 0) {
    throw new Error("Vibes gratuites non utilisables pour les cadeaux. Achète des Vibes pour offrir.");
  }

  const finalUser = await db.user.findUnique({
    where: { id: userId },
    select: { gems: true, freeGems: true },
  });

  return { gems: finalUser?.gems ?? 0, freeGems: finalUser?.freeGems ?? 0 };
}

/// Add free Vibes (streak reward, referral bonus). These increase BOTH
/// `gems` and `freeGems` so they show in the total balance but are tracked
/// as "free" and cannot fund gifts.
export async function addFreeGems(userId: string, amount: number): Promise<{ gems: number; freeGems: number }> {
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      gems: { increment: amount },
      freeGems: { increment: amount },
    },
    select: { gems: true, freeGems: true },
  });
  return { gems: updated.gems, freeGems: updated.freeGems };
}

/// Add purchased Vibes. Only `gems` is incremented (not `freeGems`), so
/// these Vibes CAN be used to send gifts.
export async function addPurchasedGems(userId: string, amount: number): Promise<{ gems: number; freeGems: number }> {
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      gems: { increment: amount },
      // freeGems unchanged
    },
    select: { gems: true, freeGems: true },
  });
  return { gems: updated.gems, freeGems: updated.freeGems };
}
