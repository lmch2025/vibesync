// GET /api/vibe/gem-packs — gem packs with price tiers
import { NextResponse } from "next/server";
import { GEM_PACKS } from "@/lib/vibe/constants";

export async function GET() {
  return NextResponse.json({ packs: GEM_PACKS });
}
