import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Fields that belong to Profile
    const profileUpdates: any = {};
    if (body.bio !== undefined) profileUpdates.bio = body.bio.trim();
    if (body.city !== undefined) profileUpdates.city = body.city.trim();
    if (body.age !== undefined) profileUpdates.age = Number(body.age);
    if (body.gender !== undefined) profileUpdates.gender = body.gender;
    if (body.lookingFor !== undefined) profileUpdates.lookingFor = body.lookingFor;
    if (body.vibeAnswer !== undefined) profileUpdates.vibeAnswer = body.vibeAnswer;
    // Discovery filters (Découvrir tab filter sheet) — clamped for safety.
    if (body.prefMinAge !== undefined) profileUpdates.prefMinAge = Math.min(80, Math.max(18, Number(body.prefMinAge) || 18));
    if (body.prefMaxAge !== undefined) profileUpdates.prefMaxAge = Math.min(99, Math.max(18, Number(body.prefMaxAge) || 99));
    if (body.prefMaxDistance !== undefined) profileUpdates.prefMaxDistance = Math.min(500, Math.max(1, Number(body.prefMaxDistance) || 50));

    if (Object.keys(profileUpdates).length > 0) {
      await db.profile.update({
        where: { userId: user.id },
        data: profileUpdates,
      });
    }

    // Fields that belong to User
    const userUpdates: any = {};
    if (body.verified !== undefined) userUpdates.verified = body.verified;

    if (Object.keys(userUpdates).length > 0) {
      await db.user.update({
        where: { id: user.id },
        data: userUpdates,
      });
    }

    // Return the updated user and profile to sync the client state
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}
