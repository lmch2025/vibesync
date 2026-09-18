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
//
// PREMIUM ACTION EFFECTS (real, visible in the deck):
//   • Boost       — candidate's score × recBoostMultiplier + `boosted` flag
//   • Projecteur  — owners with an active spotlight are INJECTED at the top
//                   of decks (bypassing distance) with a `spotlight` flag
//   • Cœur d'Or   — profiles whose owner sent ME a golden heart are pinned
//                   at the very top with a `goldenHeart` flag (gold badge)
//   • Passport    — when MY passport is active, profiles from my passport
//                   city are blended in (distance bypassed) with a
//                   `passport` flag, and the response carries `passport` meta
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
  const now = new Date();

  // Profiles the viewer already swiped on
  const swiped = await db.swipe.findMany({
    where: { fromUserId: user.id },
    select: { toProfileId: true },
  });
  const swipedIds = swiped.map((s) => s.toProfileId);

  // ── USER FILTERS (gender preference) ──
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
  const nowMs = Date.now();
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
        where: { userId: { in: candidateUserIds }, expiresAt: { gt: now } },
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

  type ScoredProfile = {
    profile: (typeof candidates)[number];
    score: number;
    distanceKm: number | null;
    boosted: boolean;
  };
  const scored: ScoredProfile[] = [];

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
    const daysOld = (nowMs - p.createdAt.getTime()) / 86_400_000;
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

    const isBoosted = boostedUserIds.has(p.userId);

    // Active Boost → multiplied priority (top of the queue).
    if (isBoosted) score *= settings.recBoostMultiplier;

    scored.push({ profile: p, score, distanceKm, boosted: isBoosted });
  }

  scored.sort((a, b) => b.score - a.score);

  // ── CŒUR D'OR — profiles whose owner sent me a golden heart get pinned ──
  // at the very top of MY deck with a golden badge (they paid for exactly
  // that promise). Golden senders bypass discovery filters by design.
  const goldenHeartProfiles: ScoredProfile[] = [];
  try {
    if (me) {
      const goldenSwipes = await db.swipe.findMany({
        where: {
          toProfileId: me.id,
          direction: "superlike",
          fromUser: { goldenHeartUntil: { gt: now } },
        },
        select: { fromUserId: true },
      });
      const goldenUserIds = goldenSwipes
        .map((s) => s.fromUserId)
        .filter((uid) => uid !== user.id);
      if (goldenUserIds.length > 0) {
        const goldenProfiles = await db.profile.findMany({
          where: {
            userId: { in: goldenUserIds },
            id: { notIn: swipedIds },
            modStatus: "approved",
          },
          include: { user: { select: { verified: true } } },
          take: 3,
        });
        for (const p of goldenProfiles) {
          const distanceKm =
            iHaveCoords && hasCoords(p.lat, p.lng)
              ? Math.round(haversineKm(myLat, myLng, p.lat, p.lng))
              : null;
          goldenHeartProfiles.push({ profile: p, score: 2, distanceKm, boosted: false });
        }
      }
    }
  } catch {
    // Defensive — golden heart injection must never break the deck.
  }

  // ── PROJECTEUR — owners with an active spotlight are injected at the top ──
  // of decks for the whole hour (bypassing the distance filter — that is the
  // paid visibility effect). Gender + age preferences stay respected, capped
  // at 2 per deck so the deck stays diverse.
  const spotlightProfiles: ScoredProfile[] = [];
  try {
    const spotlightUsers = await db.user.findMany({
      where: {
        id: { not: user.id },
        spotlightUntil: { gt: now },
      },
      select: { id: true },
      take: 12,
    });
    const spotlightIds = spotlightUsers.map((u) => u.id);
    if (spotlightIds.length > 0) {
      const spotProfiles = await db.profile.findMany({
        where: {
          userId: { in: spotlightIds },
          id: { notIn: swipedIds },
          modStatus: "approved",
          ...(wants ? { gender: wants } : {}),
        },
        include: { user: { select: { verified: true } } },
        take: 8,
      });
      for (const p of spotProfiles) {
        if (p.age < prefMinAge || p.age > prefMaxAge) continue;
        if (goldenHeartProfiles.some((g) => g.profile.id === p.id)) continue;
        const distanceKm =
          iHaveCoords && hasCoords(p.lat, p.lng)
            ? Math.round(haversineKm(myLat, myLng, p.lat, p.lng))
            : null;
        spotlightProfiles.push({ profile: p, score: 1.5, distanceKm, boosted: false });
      }
    }
  } catch {
    // Defensive.
  }

  // ── PASSPORT — blend in profiles from my passport city ──────────────────
  // Distance filter bypassed (the user explicitly paid to explore that city);
  // gender + age preferences stay respected.
  const passportActive =
    !!user.passportUntil && user.passportUntil.getTime() > nowMs && !!user.passportCity;
  const passportProfiles: ScoredProfile[] = [];
  let passportMeta: { city: string; until: string } | null = null;
  if (passportActive && user.passportCity) {
    passportMeta = { city: user.passportCity, until: user.passportUntil!.toISOString() };
    try {
      const spot = await db.profile.findMany({
        where: {
          city: user.passportCity,
          id: { notIn: swipedIds },
          userId: { not: user.id },
          modStatus: "approved",
          ...(wants ? { gender: wants } : {}),
        },
        include: { user: { select: { verified: true } } },
        take: 8,
        orderBy: { createdAt: "desc" },
      });
      for (const p of spot) {
        if (p.age < prefMinAge || p.age > prefMaxAge) continue;
        if (
          goldenHeartProfiles.some((g) => g.profile.id === p.id) ||
          spotlightProfiles.some((g) => g.profile.id === p.id)
        ) {
          continue;
        }
        const distanceKm =
          iHaveCoords && hasCoords(p.lat, p.lng)
            ? Math.round(haversineKm(myLat, myLng, p.lat, p.lng))
            : null;
        passportProfiles.push({ profile: p, score: 1.2, distanceKm, boosted: false });
      }
    } catch {
      // Defensive.
    }
  }

  // Assemble: golden hearts → spotlight → normal ranked → passport extras.
  const seen = new Set<string>();
  const final: Array<ScoredProfile & { golden: boolean; spotlight: boolean; passport: boolean }> = [];
  for (const g of goldenHeartProfiles.slice(0, 3)) {
    if (seen.has(g.profile.id)) continue;
    seen.add(g.profile.id);
    final.push({ ...g, golden: true, spotlight: false, passport: false });
  }
  for (const s of spotlightProfiles.slice(0, 2)) {
    if (seen.has(s.profile.id)) continue;
    seen.add(s.profile.id);
    final.push({ ...s, golden: false, spotlight: true, passport: false });
  }
  for (const item of scored) {
    if (seen.has(item.profile.id)) continue;
    seen.add(item.profile.id);
    final.push({ ...item, golden: false, spotlight: false, passport: false });
  }
  for (const p of passportProfiles.slice(0, 6)) {
    if (seen.has(p.profile.id)) continue;
    seen.add(p.profile.id);
    final.push({ ...p, golden: false, spotlight: false, passport: true });
  }

  return NextResponse.json({
    profiles: final.slice(0, Math.max(settings.deckSize, passportProfiles.length > 0 ? settings.deckSize + 4 : settings.deckSize)).map(({ profile: p, distanceKm, boosted, golden, spotlight, passport }) => ({
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
      boosted,
      goldenHeart: golden,
      spotlight,
      passport,
    })),
    ...(passportMeta ? { passport: passportMeta } : {}),
  });
}
