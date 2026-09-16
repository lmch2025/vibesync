// GET /api/vibe/settings — public, non-sensitive app configuration.
// Used by the client to display the REAL admin-configured values (e.g. the
// anti-spam message limit announced in the match overlay and chat banner)
// instead of hardcoded constants that could drift from the DB setting.
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/vibe/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    maxMessagesBeforeReply: s.maxMessagesBeforeReply,
    welcomeGems: s.welcomeGems,
    platformCommission: s.platformCommission,
    withdrawalThresholdEur: s.withdrawalThresholdEur,
    defaultRadiusKm: s.defaultRadiusKm,
  });
}
