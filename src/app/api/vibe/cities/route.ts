// GET /api/vibe/cities?q=<query>
// Predictive city search — returns up to 8 matches. Only exact selection
// (by name+country) is valid in onboarding; free typing is not accepted.
import { NextResponse } from "next/server";
import { searchCities } from "@/lib/vibe/cities";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const results = searchCities(q, 8);
  return NextResponse.json({ cities: results });
}
