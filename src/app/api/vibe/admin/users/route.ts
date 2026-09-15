// GET /api/vibe/admin/users — paginated user list for admin
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const where = q
    ? {
        OR: [
          { phone: { contains: q } },
          { name: { contains: q } },
          { profile: { displayName: { contains: q } } },
        ],
      }
    : {};
  const users = await db.user.findMany({
    where,
    include: { profile: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      phone: u.phone.replace(/(\d{2})\d+(\d{2})/, "$1•••••$2"),
      name: u.name,
      displayName: u.profile?.displayName ?? null,
      role: u.role,
      currency: u.currency,
      gems: u.gems,
      walletEurCents: u.walletEurCents,
      verified: u.verified,
      banned: u.banned,
      createdAt: u.createdAt,
      city: u.profile?.city ?? null,
    })),
  });
}
