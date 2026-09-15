// POST /api/vibe/profile/video — add or update profile videos.
// Supports up to 3 videos. Auto-trims to 15 seconds via Cloudinary transformation.
//
// Body: `{ videoUrl, posterUrl, videoDuration, slot?: 1|2|3 }`
//   - slot defaults to 1 (primary video)
//   - If slot already has a video, it's replaced
//
// The 15-second trim is done via Cloudinary URL transformation:
//   https://res.cloudinary.com/.../video/upload/eo_15/...mp4
// This truncates the video at 15 seconds without re-encoding.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

const MAX_DURATION = 15;

function isDataUrl(s: string): boolean {
  return typeof s === "string" && s.startsWith("data:");
}

/// Apply a 15-second trim transformation to a Cloudinary video URL.
/// Returns the original URL if it's not a Cloudinary URL.
function trimTo15(videoUrl: string): string {
  if (!videoUrl.includes("cloudinary.com")) return videoUrl;
  const idx = videoUrl.indexOf("/upload/");
  if (idx === -1) return videoUrl;
  const before = videoUrl.slice(0, idx + "/upload/".length);
  const after = videoUrl.slice(idx + "/upload/".length);
  // If already has a transformation, prepend eo_15,
  if (after.startsWith("v1/") || after.match(/^v\d+\//)) {
    // No existing transformation — insert eo_15/
    return `${before}eo_15/${after}`;
  }
  return videoUrl;
}

/// Derive poster URL from video URL (so_1 = frame at 1s, f_jpg = JPG format).
function derivePoster(videoUrl: string): string {
  if (!videoUrl.includes("cloudinary.com")) return "";
  const idx = videoUrl.indexOf("/upload/");
  if (idx === -1) return "";
  const before = videoUrl.slice(0, idx + "/upload/".length);
  const after = videoUrl.slice(idx + "/upload/".length);
  // Strip existing transformation if present
  const versionMatch = after.match(/^(v\d+\/)/);
  const pathAfter = versionMatch ? after : after;
  const noExt = pathAfter.replace(/\.(mp4|webm|mov|m4v|mkv|avi|ts|flv|3gp|ogv)$/i, "");
  return `${before}so_1,f_jpg/${noExt}.jpg`;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const rawVideoUrl = (body.videoUrl ?? "").toString().trim();
    const slot = [1, 2, 3].includes(body.slot) ? body.slot : 1;

    if (!rawVideoUrl) return NextResponse.json({ error: "videoUrl manquant" }, { status: 400 });
    // if (isDataUrl(rawVideoUrl)) return NextResponse.json({ error: "URL Cloudinary requise" }, { status: 400 });

    // Apply 15-second trim (only applies to Cloudinary URLs)
    const videoUrl = trimTo15(rawVideoUrl);
    
    // Derive poster from the video URL if not provided or if fallback needed
    let posterUrl = body.posterUrl;
    if (!posterUrl) {
      posterUrl = isDataUrl(videoUrl) ? "" : derivePoster(videoUrl);
    }

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    // Update the correct slot
    const updateData: any = { modStatus: "pending" };
    if (slot === 1) {
      updateData.videoUrl = videoUrl;
      updateData.posterUrl = posterUrl;
      updateData.videoDuration = MAX_DURATION;
    } else if (slot === 2) {
      updateData.videoUrl2 = videoUrl;
      updateData.posterUrl2 = posterUrl;
    } else {
      updateData.videoUrl3 = videoUrl;
      updateData.posterUrl3 = posterUrl;
    }

    const updated = await db.profile.update({
      where: { id: profile.id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      slot,
      videoUrl,
      posterUrl,
      videos: {
        1: { url: updated.videoUrl, poster: updated.posterUrl },
        2: { url: updated.videoUrl2, poster: updated.posterUrl2 },
        3: { url: updated.videoUrl3, poster: updated.posterUrl3 },
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}

/// DELETE /api/vibe/profile/video — remove a video from a slot.
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const slot = parseInt(searchParams.get("slot") || "1", 10) as 1 | 2 | 3;

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    const updateData: any = {};
    if (slot === 1) { updateData.videoUrl = ""; updateData.posterUrl = ""; updateData.videoDuration = 0; }
    else if (slot === 2) { updateData.videoUrl2 = ""; updateData.posterUrl2 = ""; }
    else { updateData.videoUrl3 = ""; updateData.posterUrl3 = ""; }

    await db.profile.update({ where: { id: profile.id }, data: updateData });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
