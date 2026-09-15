// GET /api/vibe/profiles/deck — swipe deck of profiles not yet swiped by the user.
// In production this applies Haversine geo-distance + vibe-match + boost priority.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Profiles the user already swiped on
  const swiped = await db.swipe.findMany({
    where: { fromUserId: user.id },
    select: { toProfileId: true },
  });
  const swipedIds = swiped.map((s) => s.toProfileId);

  const profiles = await db.profile.findMany({
    where: {
      id: { notIn: swipedIds },
      userId: { not: user.id },
      modStatus: "approved",
    },
    include: { user: { select: { verified: true, gems: true } } },
    take: 12,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    profiles: profiles.map((p) => ({
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
    })),
  });
}
