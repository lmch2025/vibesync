// GET /api/vibe/me/likes — « Voir mes Likes » persistent access window.
//
// Paying for seeLikes (20 💎, POST /api/vibe/gems/spend) sets
// User.seeLikesUntil on the user: for that (admin-configurable, default
// 5 min) window, this endpoint serves the likers list in the rich
// RichLiker format so the frontend can re-open a full viewer (profile
// detail, swipe back, gift) instead of the old 4s auto-dismiss modal.
//
// Outside the window (never set / expired) → 200 with until:null and an
// empty list: NO info leak, NO error — the caller simply falls back to the
// default "pay to reveal" experience.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { getLikersWithStatus } from "@/lib/vibe/likes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const until = user.seeLikesUntil;
  if (!until || until.getTime() <= Date.now()) {
    // No active window — answer the same shape, with nothing in it.
    return NextResponse.json({ until: null, likers: [], hiddenByGhost: 0 });
  }

  const { likers, hiddenByGhost } = await getLikersWithStatus(
    db,
    { id: user.id, profileId: user.profile?.id ?? null, lat: user.profile?.lat, lng: user.profile?.lng },
  );
  return NextResponse.json({ until: until.toISOString(), likers, hiddenByGhost });
}
