// GET /api/vibe/profiles/deck — swipe deck ranked by the recommendation
// algorithm. Every signal weight is ADMIN-CONFIGURABLE (Settings tab) and the
// USER controls their own discovery filters (gender, age range, max distance)
// from the non-intrusive filter sheet in the Découvrir tab.
//
// Score (0..1 before boost) = Σ(weightᵢ × signalᵢ) / Σweights, where:
//   • distance  — Haversine km between viewer & candidate (closer = higher)
//   • age       — |viewer age − candidate age| (0 apart = 1, ≥15 apart = 0)
//   • vibe      — Vibe Check compatibility:
//                  same question + same answer  → 1.0
//                  same question + other answer → 0.3
//                  different question           → 0.6 (neutral)
//   • verified  — candidate's account is verified (0/1)
//   • recency   — profile freshness (linear decay over 30 days)
//   • popularity— likes/superlikes received (log-scaled: 10 likes ≈ 0.6)
// A profile with an active Boost gets its score × recBoostMultiplier, then
// the list is sorted by descending score and truncated to deckSize.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { getSettings } from "@/lib/vibe/settings";

/// Great-circle distance between two (lat, lng) points, in km.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const me = user.profile;
  const settings = await getSettings();

  // Profiles the viewer already swiped on
  const swiped = await db.swipe.findMany({
    where: { fromUserId: user.id },
    select: { toProfileId: true },
  });
  const swipedIds = swiped.map((s) => s.toProfileId);

  // ── USER FILTERS (gender preference) ──
  // "all" or a missing preference shows everyone.
  const wants = me?.lookingFor && me.lookingFor !== "all" ? me.lookingFor : null;

  // Wider candidate pool than the final deck so ranking has room to reorder.
  const poolSize = Math.max(settings.deckSize * 4, 40);
  const candidates = await db.profile.findMany({
    where: {
      id: { notIn: swipedIds },
      userId: { not: user.id },
      modStatus: "approved",
      ...(wants ? { gender: wants } : {}),
    },
    include: { user: { select: { verified: true } } },
    take: poolSize,
    orderBy: { createdAt: "desc" },
  });

  // ── USER FILTERS (age range + distance) need post-fetch computation ──
  const now = Date.now();
  const hasCoords = (lat: number, lng: number) => lat !== 0 || lng !== 0;
  const myLat = me?.lat ?? 0;
  const myLng = me?.lng ?? 0;
  const iHaveCoords = me ? hasCoords(myLat, myLng) : false;
  const prefMinAge = me?.prefMinAge ?? 18;
  const prefMaxAge = me?.prefMaxAge ?? 99;
  const prefMaxDistance = me?.prefMaxDistance ?? 50;

  // Aggregated popularity (likes received) for the whole pool — one query.
  const candidateIds = candidates.map((c) => c.id);
  const likeCounts = candidateIds.length
    ? await db.swipe.groupBy({
        by: ["toProfileId"],
        where: { toProfileId: { in: candidateIds }, direction: { in: ["like", "superlike"] } },
        _count: { _all: true },
      })
    : [];
  const likeMap = new Map(likeCounts.map((l) => [l.toProfileId, l._count._all]));

  // Active boosts for the whole pool — one query.
  const candidateUserIds = candidates.map((c) => c.userId);
  const boosts = candidateUserIds.length
    ? await db.boost.findMany({
        where: { userId: { in: candidateUserIds }, expiresAt: { gt: new Date() } },
        select: { userId: true },
      })
    : [];
  const boostedUserIds = new Set(boosts.map((b) => b.userId));

  const totalWeight =
    settings.recWeightDistance +
    settings.recWeightAge +
    settings.recWeightVibe +
    settings.recWeightVerified +
    settings.recWeightRecency +
    settings.recWeightPopularity;

  const scored: Array<{ profile: (typeof candidates)[number]; score: number; distanceKm: number | null }> = [];

  for (const p of candidates) {
    // Hard user filters — age range
    if (p.age < prefMinAge || p.age > prefMaxAge) continue;

    // Hard user filter — distance (only when BOTH sides have coordinates;
    // profiles without coords are never distance-excluded).
    let distanceKm: number | null = null;
    let distanceSignal = 0.5; // neutral when unknown
    if (iHaveCoords && hasCoords(p.lat, p.lng)) {
      distanceKm = Math.round(haversineKm(myLat, myLng, p.lat, p.lng));
      if (distanceKm > prefMaxDistance) continue; // hard filter
      // 0 km → 1.0 ; prefMaxDistance km → 0.0 (linear within the user's radius)
      distanceSignal = Math.max(0, 1 - distanceKm / Math.max(1, prefMaxDistance));
    }

    // Age proximity signal: 0 years apart → 1.0 ; ≥15 years → 0.0
    const myAge = me?.age ?? p.age;
    const ageSignal = Math.max(0, 1 - Math.abs(myAge - p.age) / 15);

    // Vibe Check compatibility
    let vibeSignal = 0.6; // different question → neutral
    if (me && p.vibeQuestion === me.vibeQuestion) {
      vibeSignal = p.vibeAnswer === me.vibeAnswer ? 1.0 : 0.3;
    }

    const verifiedSignal = p.user.verified ? 1 : 0;

    // Recency: linear decay over 30 days (fresh profile → 1.0)
    const daysOld = (now - p.createdAt.getTime()) / 86_400_000;
    const recencySignal = Math.max(0, 1 - daysOld / 30);

    // Popularity: log-scaled so a few likes already matter, whales don't dominate.
    const likes = likeMap.get(p.id) ?? 0;
    const popularitySignal = likes > 0 ? Math.min(1, Math.log10(likes + 1) / Math.log10(51)) : 0;

    let score =
      totalWeight > 0
        ? (settings.recWeightDistance * distanceSignal +
            settings.recWeightAge * ageSignal +
            settings.recWeightVibe * vibeSignal +
            settings.recWeightVerified * verifiedSignal +
            settings.recWeightRecency * recencySignal +
            settings.recWeightPopularity * popularitySignal) /
          totalWeight
        : 0;

    // Active Boost → multiplied priority (top of the queue).
    if (boostedUserIds.has(p.userId)) score *= settings.recBoostMultiplier;

    scored.push({ profile: p, score, distanceKm });
  }

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    profiles: scored.slice(0, settings.deckSize).map(({ profile: p, distanceKm }) => ({
      id: p.id,
      displayName: p.displayName,
      age: p.age,
      city: p.city,
      bio: p.bio,
      videoUrl: p.videoUrl,
      posterUrl: p.posterUrl,
      videoDuration: p.videoDuration,
      gender: p.gender,
      vibeQuestion: p.vibeQuestion,
      vibeAnswer: p.vibeAnswer,
      verified: p.user.verified,
      distanceKm,
    })),
  });
}
