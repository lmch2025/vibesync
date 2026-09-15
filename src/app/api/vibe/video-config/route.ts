// GET /api/vibe/video-config — public video configuration for the client.
// Returns max duration, max count, max width, quality, max size.
// The client uses this to compress videos before upload.
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/vibe/settings";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    maxDuration: settings.videoMaxDuration,
    maxCount: settings.videoMaxCount,
    maxWidth: settings.videoMaxWidth,
    quality: settings.videoQuality,
    maxSizeKb: settings.videoMaxSizeKb,
  });
}
