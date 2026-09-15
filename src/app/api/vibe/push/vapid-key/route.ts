// GET /api/vibe/push/vapid-key — VAPID public key for the browser push
// subscription. Returns `{ publicKey, configured }` so the client can
// decide whether to offer the push opt-in at all (no point showing the
// prompt if the server isn't configured).
import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  return NextResponse.json({
    publicKey,
    configured: publicKey.length > 0,
  });
}
