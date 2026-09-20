// GET   /api/vibe/admin/pending-profiles — real profiles awaiting moderation
// POST  /api/vibe/admin/pending-profiles — approve/reject a pending profile
//
// PRODUCTION MODERATION FLOW: every new profile WITH a video lands in
// modStatus "pending" (see onboarding + /profile/video) and is INVISIBLE in
// decks until an admin validates the video here. Profiles without video are
// auto-approved (nothing to moderate). This route is the missing link between
// onboarding and visibility — without it, real new users would never appear.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { notify } from "@/lib/vibe/notify";
import { getUserLang, tFor } from "@/lib/vibe/i18n/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const pending = await db.profile.findMany({
    where: { modStatus: "pending" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: { verified: true, createdAt: true } } },
  });
  return NextResponse.json({
    pending: pending.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName: p.displayName,
      age: p.age,
      city: p.city,
      bio: p.bio,
      gender: p.gender,
      videoUrl: p.videoUrl,
      posterUrl: p.posterUrl,
      photos: [p.photoUrl1, p.photoUrl2, p.photoUrl3, p.photoUrl4, p.photoUrl5].filter(Boolean),
      createdAt: p.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { profileId, action } = await req.json().catch(() => ({} as any));
  if (!profileId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  if (profile.modStatus !== "pending") {
    return NextResponse.json({ error: "Ce profil n'est pas en attente" }, { status: 409 });
  }

  await db.profile.update({
    where: { id: profileId },
    data: { modStatus: action === "approve" ? "approved" : "rejected" },
  });

  // Real feedback to the user — their profile visibility just changed.
  // Localisé dans la langue du compte du destinataire.
  const lang = await getUserLang(profile.userId);
  await notify(
    profile.userId,
    action === "approve" ? "system" : "marketing",
    tFor(lang, action === "approve" ? "notif.videoApproved.title" : "notif.videoRejected.title"),
    tFor(lang, action === "approve" ? "notif.videoApproved.body" : "notif.videoRejected.body"),
    action === "approve" ? "🎉" : "📹"
  );

  return NextResponse.json({ ok: true, action, profileId });
}
