// POST /api/vibe/upload — server-side Cloudinary upload (fallback).
// The primary upload path is client-side (cloudinary-client.ts) which
// uploads directly to Cloudinary. This route exists as a fallback.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/vibe/session";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { dataUrl, type } = await req.json();
    if (!dataUrl || !type) return NextResponse.json({ error: "Missing dataUrl or type" }, { status: 400 });

    const isConfigured = !!process.env.CLOUDINARY_URL ||
      (!!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET);

    if (!isConfigured) {
      return NextResponse.json({ url: "", error: "Cloudinary non configuré" });
    }

    const { v2: cloudinary } = await import("cloudinary");
    if (process.env.CLOUDINARY_URL) {
      const match = process.env.CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
      if (match) {
        cloudinary.config({ cloud_name: match[3], api_key: match[1], api_secret: match[2] });
      }
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }

    const folder = type === "video" ? "tiluu/profiles/videos" : "tiluu/profiles/posters";
    const resourceType = type === "video" ? "video" : "image";

    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: resourceType,
    });

    return NextResponse.json({ url: (result as any).secure_url });
  } catch (e: any) {
    console.error("[upload] Error:", e?.message || e);
    return NextResponse.json({ url: "", error: "Upload échoué" }, { status: 503 });
  }
}
