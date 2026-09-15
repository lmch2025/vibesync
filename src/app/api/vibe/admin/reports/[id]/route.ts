// POST /api/vibe/admin/reports/[id] — approve or remove a flagged video
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const { action } = await req.json().catch(() => ({} as any));
  if (!["approve", "remove"].includes(action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }
  const report = await db.videoReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.videoReport.update({
      where: { id },
      data: { status: action === "approve" ? "approved" : "removed" },
    });
    await tx.profile.update({
      where: { id: report.profileId },
      data: { modStatus: action === "approve" ? "approved" : "rejected" },
    });
  });
  return NextResponse.json({ ok: true, action });
}
