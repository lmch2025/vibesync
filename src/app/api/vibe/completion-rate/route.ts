// GET /api/vibe/completion-rate — profile completion percentage.
//
// 12 tasks (account_created is always true → percentage never hits 0%
// so the user always sees at least 1/12 ≈ 8%). Returns the list of
// task statuses so the UI can render per-task chips.
//
// Tasks checked (against the User + Profile models):
//   1.  account_created   — true (always)
//   2.  profile_created   — Profile row exists
//   3.  video_uploaded    — Profile.videoUrl non-empty
//   4.  poster_uploaded   — Profile.posterUrl non-empty
//   5.  bio_filled        — Profile.bio non-empty (≥10 chars)
//   6.  city_set          — Profile.city non-empty
//   7.  age_set           — Profile.age > 0
//   8.  gender_set        — Profile.gender set
//   9.  looking_for_set   — Profile.lookingFor set
//  10.  vibe_answered     — Profile.vibeAnswer set
//  11.  verified          — User.verified true
//  12.  streak_started    — User.streak ≥ 1
//
// Graceful fallback: returns `{ percentage: 0, completedCount: 0,
// totalCount: 12, tasks: [] }` if the DB is unreachable.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export type CompletionTask = {
  key: string;
  label: string;
  emoji: string;
  done: boolean;
};

const TOTAL = 12;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    const tasks: CompletionTask[] = [
      {
        key: "account_created",
        label: "Compte créé",
        emoji: "✅",
        done: true, // always true → never 0%
      },
      {
        key: "profile_created",
        label: "Profil créé",
        emoji: "👤",
        done: !!profile,
      },
      {
        key: "video_uploaded",
        label: "Vidéo 15s",
        emoji: "🎬",
        done: !!profile && !!profile.videoUrl && profile.videoUrl.length > 0,
      },
      {
        key: "poster_uploaded",
        label: "Vignette",
        emoji: "🖼️",
        done: !!profile && !!profile.posterUrl && profile.posterUrl.length > 0,
      },
      {
        key: "bio_filled",
        label: "Bio",
        emoji: "📝",
        done: !!profile && profile.bio.trim().length >= 10,
      },
      {
        key: "city_set",
        label: "Ville",
        emoji: "📍",
        done: !!profile && profile.city.trim().length > 0,
      },
      {
        key: "age_set",
        label: "Âge",
        emoji: "🎂",
        done: !!profile && profile.age > 0,
      },
      {
        key: "gender_set",
        label: "Sexe",
        emoji: "⚧",
        done: !!profile && !!profile.gender,
      },
      {
        key: "looking_for_set",
        label: "Tu cherches",
        emoji: "💘",
        done: !!profile && !!profile.lookingFor,
      },
      {
        key: "vibe_answered",
        label: "Vibe Check",
        emoji: "🎯",
        done: !!profile && !!profile.vibeAnswer,
      },
      {
        key: "verified",
        label: "Compte vérifié",
        emoji: "✔️",
        done: !!user.verified,
      },
      {
        key: "streak_started",
        label: "Série lancée",
        emoji: "🔥",
        done: !!user.streak && user.streak >= 1,
      },
    ];

    const completedCount = tasks.filter((t) => t.done).length;
    const percentage = Math.round((completedCount / TOTAL) * 100);

    return NextResponse.json({
      percentage,
      completedCount,
      totalCount: TOTAL,
      tasks,
    });
  } catch (e) {
    return NextResponse.json({
      percentage: 0,
      completedCount: 0,
      totalCount: TOTAL,
      tasks: [],
      warning: e instanceof Error ? e.message : "completion-rate unavailable",
    });
  }
}
