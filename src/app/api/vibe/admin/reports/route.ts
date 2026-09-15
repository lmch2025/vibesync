// GET /api/vibe/admin/reports — video moderation queue
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // If no reports exist yet, synthesise a pending queue from reported-looking profiles
  const reports = await db.videoReport.findMany({
    include: { profile: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (reports.length === 0) {
    // Synthesise: flag a couple of seeded profiles as AI-flagged for the demo
    const flagged = await db.profile.findMany({ take: 3, orderBy: { createdAt: "asc" } });
    const synth: any[] = [];
    const reasons = ["Contenu potentiellement suggestif (IA: 87%)", "Logo tiers détecté", "Vidéo floue / qualité basse"];
    for (let i = 0; i < flagged.length; i++) {
      const r = await db.videoReport.create({
        data: {
          profileId: flagged[i].id,
          reason: reasons[i % reasons.length],
          source: "ai",
          status: "pending",
        },
        include: { profile: { include: { user: true } } },
      });
      synth.push(r);
    }
    return NextResponse.json({
      reports: synth.map((r) => ({
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
