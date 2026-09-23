// Shared « Voir mes Likes » helper — rich likers list with interaction state.
//
// Used by BOTH the payment flow (POST /api/vibe/gems/spend, action `seeLikes`)
// and the persistent access window (GET /api/vibe/me/likes): after paying,
// the user can re-open the full list while User.seeLikesUntil is in the
// future. Both endpoints must return the EXACT same shape (frozen contract
// with the frontend LikesViewer), hence this single source of truth.
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/// A liker in "rich" format: everything the LikesViewer needs to render the
/// card, open the profile detail modal, swipe back (instant match!) or send
/// a gift. `id` is the liker's PROFILE id — the handle used by the swipe and
/// gift APIs.
export type RichLiker = {
  id: string;            // liker's PROFILE id (used as profileId for swipe/gift APIs)
  displayName: string;
  age: number;
  city: string;
  bio: string;
  posterUrl: string;     // fallback "/profiles/lea.png" when empty
  videoUrl: string;
  videoDuration: number;
  gender: string;
  vibeQuestion: string;
  vibeAnswer: string;
  verified: boolean;     // liker's User.verified
  direction: "like" | "superlike";   // how they liked the viewer
  likedAt: string;       // ISO of their swipe
  myDirection: "like" | "superlike" | "pass" | null; // viewer's swipe toward liker's profile (null = not swiped)
  matched: boolean;      // a Match row exists between the two users
  matchId: string | null;
  videos: { url: string; poster: string }[];  // videoUrl/videoUrl2/videoUrl3 slots compacted
  photos: string[];                                  // photoUrl1..5 compacted
  lookingFor: string;
  relationshipType: string;
  distanceKm: number | null;  // haversine when both profiles have coordinates (liker lat/lng not 0,0), else null
};

/// Great-circle distance between two (lat, lng) points, in km.
/// (Same formula as gems/spend — kept local so this helper stays standalone.)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/// Fetch the profiles that liked the viewer, in RichLiker format.
/// - sorted: superlikes first, then most recent; capped at `take` (default 24)
/// - ghost-mode likers (ghostModeUntil in the future) are EXCLUDED and
///   counted in `hiddenByGhost` (honest tease — never fabricated)
/// - accepts either the raw prisma client or a transaction client, so the
///   payment flow can call it INSIDE its transaction and the access-window
///   route outside of any.
export async function getLikersWithStatus(
  tx: Prisma.TransactionClient | typeof db,
  viewer: { id: string; profileId: string | null; lat?: number | null; lng?: number | null },
  take = 24,
): Promise<{ likers: RichLiker[]; hiddenByGhost: number }> {
  if (!viewer.profileId) return { likers: [], hiddenByGhost: 0 };
  const now = Date.now();

  // Buffer of 60 recent likes — headroom to still fill `take` after
  // ghost-mode filtering, without scanning the whole swipe table.
  const likes = await tx.swipe.findMany({
    where: { toProfileId: viewer.profileId, direction: { in: ["like", "superlike"] } },
    include: { fromUser: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // Ghost filter (real effect of Mode Fantôme): excluded but counted.
  let hiddenByGhost = 0;
  const candidates: {
    fromUserId: string;
    verified: boolean;
    direction: string;
    createdAt: Date;
    profile: NonNullable<(typeof likes)[number]["fromUser"]["profile"]>;
  }[] = [];
  for (const l of likes) {
    if (l.fromUser.ghostModeUntil && l.fromUser.ghostModeUntil.getTime() > now) {
      hiddenByGhost++;
      continue;
    }
    // A liker without a profile can't be rendered or interacted with — skip.
    if (l.fromUser.profile) {
      candidates.push({
        fromUserId: l.fromUser.id,
        verified: l.fromUser.verified,
        direction: l.direction,
        createdAt: l.createdAt,
        profile: l.fromUser.profile,
      });
    }
  }

  // Sort: superlikes first, then most recent. JS sorts are stable, so each
  // group keeps the createdAt desc order of the query.
  candidates.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === "superlike" ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const selected = candidates.slice(0, take);

  // ── Batch state queries (2 queries total, regardless of liker count) ──
  // Viewer's own swipes toward the likers → myDirection map.
  const myDir = new Map<string, string>();
  const matches = new Map<string, { id: string }>();
  if (selected.length > 0) {
    const mySwipes = await tx.swipe.findMany({
      where: {
        fromUserId: viewer.id,
        toProfileId: { in: selected.map((c) => c.profile.id) },
      },
      select: { toProfileId: true, direction: true },
    });
    for (const s of mySwipes) myDir.set(s.toProfileId, s.direction);

    // Existing matches between viewer and likers → matched + matchId map.
    const likerUserIds = selected.map((c) => c.fromUserId);
    const matchRows = await tx.match.findMany({
      where: {
        OR: [
          { userAId: viewer.id, userBId: { in: likerUserIds } },
          { userBId: viewer.id, userAId: { in: likerUserIds } },
        ],
      },
      select: { id: true, userAId: true, userBId: true },
    });
    for (const m of matchRows) {
      const other = m.userAId === viewer.id ? m.userBId : m.userAId;
      matches.set(other, { id: m.id });
    }
  }

  const hasViewerCoords =
    typeof viewer.lat === "number" && Number.isFinite(viewer.lat) &&
    typeof viewer.lng === "number" && Number.isFinite(viewer.lng);

  const likers: RichLiker[] = selected.map((c) => {
    const p = c.profile;
    const m = matches.get(c.fromUserId) ?? null;
    const md = myDir.get(p.id);
    // Real distance only when BOTH sides have usable coordinates — a liker
    // profile at exactly (0,0) means "no coords set" (null island).
    const hasCoords = hasViewerCoords && (p.lat !== 0 || p.lng !== 0);
    const distanceKm = hasCoords
      ? Math.max(1, Math.round(haversineKm(viewer.lat as number, viewer.lng as number, p.lat, p.lng)))
      : null;
    return {
      id: p.id,
      displayName: p.displayName,
      age: p.age,
      city: p.city,
      bio: p.bio,
      posterUrl: p.posterUrl || "/profiles/lea.png",
      videoUrl: p.videoUrl,
      videoDuration: p.videoDuration,
      gender: p.gender,
      vibeQuestion: p.vibeQuestion,
      vibeAnswer: p.vibeAnswer,
      verified: c.verified,
      direction: c.direction === "superlike" ? "superlike" : "like",
      likedAt: c.createdAt.toISOString(),
      myDirection: md === "like" || md === "superlike" || md === "pass" ? md : null,
      matched: !!m,
      matchId: m ? m.id : null,
      videos: [
        { url: p.videoUrl, poster: p.posterUrl },
        { url: p.videoUrl2, poster: p.posterUrl2 },
        { url: p.videoUrl3, poster: p.posterUrl3 },
      ].filter((v) => v.url),
      photos: [p.photoUrl1, p.photoUrl2, p.photoUrl3, p.photoUrl4, p.photoUrl5].filter(Boolean),
      lookingFor: p.lookingFor,
      relationshipType: p.relationshipType,
      distanceKm,
    };
  });

  return { likers, hiddenByGhost };
}
