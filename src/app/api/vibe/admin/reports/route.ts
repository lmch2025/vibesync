// GET /api/vibe/admin/reports — video moderation queue (REAL reports only).
// Reported videos appear here; NEW profiles awaiting validation are served by
// /api/vibe/admin/pending-profiles (onboarding moderation flow).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // PRODUCTION: no synthetic reports — the queue shows real user/AI reports
  // only. An empty queue is the honest, real state.
  const reports = await db.videoReport.findMany({
    include: { profile: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      source: r.source,
      status: r.status,
      createdAt: r.createdAt,
      profile: {
        id: r.profile.id,
        displayName: r.profile.displayName,
        age: r.profile.age,
        city: r.profile.city,
        bio: r.profile.bio,
        videoUrl: r.profile.videoUrl,
        posterUrl: r.profile.posterUrl,
        userId: r.profile.user.id,
      },
    })),
  });
}
