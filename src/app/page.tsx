import { cookies } from "next/headers";
import { SESSION_COOKIE, getCurrentUser } from "@/lib/vibe/session";
import { getSettings } from "@/lib/vibe/settings";
import { db } from "@/lib/db";
import { ClientHome } from "./client-page";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  
  let initialUser: any = null;
  let initialRates: Record<string, number> | null = null;
  // Vidéo de fond de l'accueil administrable (Vercel Blob) — lue côté serveur
  // pour éviter tout flash : "" ⇒ vidéo locale par défaut (/profiles/swipe-bg.webm).
  const settings = await getSettings();
  const initialLandingVideo = settings.landingVideoUrl || "";
  
  if (session) {
    const user = await getCurrentUser();
    if (user) {
      initialUser = {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        currency: user.currency,
        country: user.country,
        gems: user.gems,
        freeGems: user.freeGems,
        walletEurCents: user.walletEurCents,
        verified: user.verified,
        onboardingComplete: user.onboardingComplete,
        profile: user.profile
          ? {
              id: user.profile.id,
              displayName: user.profile.displayName,
              age: user.profile.age,
              city: user.profile.city,
              bio: user.profile.bio,
              videoUrl: user.profile.videoUrl,
              posterUrl: user.profile.posterUrl,
              videoDuration: user.profile.videoDuration,
              videoUrl2: user.profile.videoUrl2,
              posterUrl2: user.profile.posterUrl2,
              videoUrl3: user.profile.videoUrl3,
              posterUrl3: user.profile.posterUrl3,
              gender: user.profile.gender,
              lookingFor: user.profile.lookingFor,
              lat: user.profile.lat,
              lng: user.profile.lng,
              vibeQuestion: user.profile.vibeQuestion,
              vibeAnswer: user.profile.vibeAnswer,
              // Discovery filters — kept in sync for the filter sheet UI.
              prefMinAge: user.profile.prefMinAge,
              prefMaxAge: user.profile.prefMaxAge,
              prefMaxDistance: user.profile.prefMaxDistance,
            }
          : null,
      };
      const rates = await db.exchangeRate.findMany();
      initialRates = {};
      for (const r of rates) initialRates[r.currency] = r.rate;
    }
  }

  // Authenticated users (admin included — the admin panel is reached from the
  // profile tab button, NOT on boot) resume straight into the app on refresh.
  const initialView = initialUser ? "app" : "landing";

  return <ClientHome initialView={initialView as any} initialUser={initialUser} initialRates={initialRates} initialLandingVideo={initialLandingVideo} />;
}
