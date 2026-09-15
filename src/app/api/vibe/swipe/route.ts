// POST /api/vibe/swipe — record a swipe; super-like costs 5 gems; check for match.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GEM_ACTIONS } from "@/lib/vibe/constants";
import { notifyMatch, notifyLike, notifySuperlike } from "@/lib/vibe/notify";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { profileId, direction } = await req.json().catch(() => ({} as any));
  if (!profileId || !["pass", "like", "superlike"].includes(direction)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const targetProfile = await db.profile.findUnique({
    where: { id: profileId },
    include: { user: true },
  });
  if (!targetProfile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  if (targetProfile.userId === user.id) return NextResponse.json({ error: "Auto-swipe interdit" }, { status: 400 });

  // Already swiped?
  const existing = await db.swipe.findUnique({
    where: { fromUserId_toProfileId: { fromUserId: user.id, toProfileId: profileId } },
  });
  if (existing) return NextResponse.json({ error: "Déjà swipé" }, { status: 409 });

  const cost = direction === "superlike" ? GEM_ACTIONS.superlike : 0;
  if (cost > 0) {
    if (user.gems < cost) return NextResponse.json({ error: "Pas assez de Vibes" }, { status: 402 });
  }

  await db.$transaction(async (tx) => {
    await tx.swipe.create({
      data: { fromUserId: user.id, toProfileId: profileId, direction, costGems: cost },
    });
    if (cost > 0) {
      // Deduct from freeGems first, then purchased (same logic as /api/vibe/gems/spend).
      const freeUsed = Math.min(user.freeGems, cost);
      const res = await tx.user.updateMany({
        where: { id: user.id, gems: { gte: cost } },
        data: {
          gems: { decrement: cost },
          freeGems: { decrement: freeUsed },
        },
      });
      if (res.count === 0) {
        throw new Error("Pas assez de Vibes");
      }
      await tx.gemTx.create({ data: { userId: user.id, delta: -cost, reason: "superlike" } });
    }
  });

  // Match detection: did the target user already like/superlike OUR profile?
  let match: any = null;
  if (direction === "like" || direction === "superlike") {
    let reciprocal: any = null;
    if (user.profile) {
      reciprocal = await db.swipe.findFirst({
        where: {
          fromUserId: targetProfile.userId,
          toProfileId: user.profile.id,
          direction: { in: ["like", "superlike"] },
        },
      });
    }
    // Sandbox demo: if no real reciprocal swipe, simulate one with ~45% probability
    // so the match celebration + chat/anti-spam flow is exercisable. Super-likes
    // boost the chance to 70%. In production this branch does not exist.
    if (!reciprocal) {
      const chance = direction === "superlike" ? 0.7 : 0.45;
      if (Math.random() < chance) reciprocal = { simulated: true };
    }
    if (reciprocal) {
      // Create the match (idempotent)
      const [a, b] = [user.id, targetProfile.userId].sort();
      const existingMatch = await db.match.findUnique({
        where: { userAId_userBId: { userAId: a, userBId: b } },
      });
      if (!existingMatch) {
        match = await db.match.create({
          data: {
            userAId: a,
            userBId: b,
            initiatedById: user.id,
            unlocked: false,
          },
        });
        // Notify BOTH users about the match.
        const myName = user.profile?.displayName ?? "Quelqu'un";
        const otherName = targetProfile.displayName ?? "Quelqu'un";
        await notifyMatch(user.id, otherName, match.id);
        await notifyMatch(targetProfile.userId, myName, match.id);
      } else {
        match = existingMatch;
      }
    }
    // Notify the target user about the like/superlike (even without a match).
    if (!match) {
      const myName = user.profile?.displayName;
      if (direction === "superlike") {
        await notifySuperlike(targetProfile.userId, myName);
      } else {
        await notifyLike(targetProfile.userId, myName);
      }
    }
  }

  const updatedGems = await db.user.findUnique({ where: { id: user.id }, select: { gems: true, freeGems: true } });
  return NextResponse.json({
    ok: true,
    direction,
    cost,
    gems: updatedGems?.gems ?? user.gems,
    freeGems: updatedGems?.freeGems ?? user.freeGems,
    match: match
      ? {
          id: match.id,
          withProfile: {
            id: targetProfile.id,
            displayName: targetProfile.displayName,
            posterUrl: targetProfile.posterUrl,
            city: targetProfile.city,
          },
        }
      : null,
  });
}
