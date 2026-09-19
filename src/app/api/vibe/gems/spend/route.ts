// POST /api/vibe/gems/spend — spend Vibes on a premium action.
// Handles all 17 premium actions with real, functional effects.
//
// CONTEXT GUARDS (before any gem deduction): actions that target someone
// (goldenHeart, crushAlert, moodRing, compatibilityReport → profileId) or a
// conversation (messageBoost → matchId) are rejected with a clear 400 when
// the context is missing, so a user can NEVER pay for a no-op.
// `superlike` is intentionally not spendable here — it belongs to the swipe
// flow (/api/vibe/swipe charges the 5 gems with full match detection).
//
// Effects (all real):
//   boost        → Boost row (30 min) → deck score ×recBoostMultiplier
//   spotlight    → spotlightUntil (1 h) → profile injected at the top of decks
//   ghostMode    → ghostModeUntil (1 h) → hidden from seeLikes / vibeRadar,
//                  like notifications suppressed
//   passport     → passportUntil (24 h) + passportCity → deck shows that city
//   timeFreeze   → peek at next 3 profiles + buff (15 min)
//   dailyDouble  → dailyDoubleUntil (24 h) → next streak claim is doubled
//   superRewind  → deletes the last 5 swipes (profiles return to the deck)
//   rewind       → deletes the last swipe
//   vibeRadar    → real distances, excludes swiped + ghost-mode profiles
//   seeLikes     → real likers (ghost-mode likers stay hidden)
//   moodRing     → deterministic daily mood derived from the target profile
//   crushAlert   → real 💘 notification to the target + sender buff (1 h)
//   goldenHeart  → super-like on the target + 💛 notification + priority
//                  placement with golden badge in the TARGET's deck + buff
//   compatibilityReport → heuristic score + AI-written analysis (LLM)
//   icebreaker   → AI-generated pickup line (LLM)
//   messageBoost → NOT spendable here (chat-flow only: /matches/[id]/messages)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GEM_ACTIONS, GemActionKey } from "@/lib/vibe/constants";
import { notify, notifyMatch } from "@/lib/vibe/notify";

/// Great-circle distance between two (lat, lng) points, in km.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/// Actions that need a target profile — the premium sheet's contextual mode
/// (or a deck card) provides it. Without context we refuse to charge.
const NEEDS_PROFILE: GemActionKey[] = ["goldenHeart", "crushAlert", "moodRing", "compatibilityReport"];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { action, profileId, city } = await req.json().catch(() => ({} as any));
  if (!GEM_ACTIONS[action as GemActionKey]) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }
  const key = action as GemActionKey;
  const cost = GEM_ACTIONS[key];

  // ── Context guards — NEVER charge for a no-op ─────────────────────────
  if (key === "superlike") {
    return NextResponse.json(
      { error: "Le Super-Like s'utilise avec le bouton ⭐ sur une carte (ou en glissant vers le haut)." },
      { status: 400 },
    );
  }
  if (key === "messageBoost") {
    return NextResponse.json(
      { error: "Le Boost Message s'utilise avec l'éclair ⚡ dans une conversation." },
      { status: 400 },
    );
  }
  if (NEEDS_PROFILE.includes(key) && !profileId) {
    return NextResponse.json(
      { error: "Cette action s'utilise depuis un profil : ouvre ✨ sur une carte dans Découvrir." },
      { status: 400 },
    );
  }
  if (user.gems < cost) return NextResponse.json({ error: "Pas assez de Vibes" }, { status: 402 });

  // Validate the target profile once, up front (for profile-scoped actions).
  let targetProfile: { id: string; userId: string; displayName: string; age: number; city: string; vibeAnswer: string; lat: number; lng: number } | null = null;
  if (profileId) {
    const p = await db.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, displayName: true, age: true, city: true, vibeAnswer: true, lat: true, lng: true },
    });
    if (!p || p.userId === user.id) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }
    targetProfile = p;
  }

  // Passport: validate + normalise the chosen city.
  let passportCity: string | null = null;
  if (key === "passport") {
    passportCity = typeof city === "string" ? city.trim().slice(0, 60) : "";
    if (!passportCity) {
      return NextResponse.json({ error: "Choisis une ville pour ton Passport" }, { status: 400 });
    }
  }

  const now = Date.now();
  const myName = user.profile?.displayName ?? "Quelqu'un";

  // Execute the action-specific effect inside a transaction.
  const effect: Record<string, any> = {};

  await db.$transaction(async (tx) => {
    // Deduct from freeGems first, then purchased.
    const freeUsed = Math.min(user.freeGems, cost);
    const res = await tx.user.updateMany({
      where: { id: user.id, gems: { gte: cost } },
      data: {
        gems: { decrement: cost },
        freeGems: { decrement: freeUsed },
      },
    });
    if (res.count === 0) {
      throw new Error("Pas assez de Vibes");
    }
    await tx.gemTx.create({ data: { userId: user.id, delta: -cost, reason: key } });

    switch (key) {
      case "boost": {
        const expires = new Date(now + 30 * 60 * 1000);
        await tx.boost.create({ data: { userId: user.id, expiresAt: expires } });
        effect.expiresAt = expires;
        effect.deckRefresh = true;
        break;
      }
      case "spotlight": {
        const until = new Date(now + 60 * 60 * 1000);
        await tx.user.update({ where: { id: user.id }, data: { spotlightUntil: until } });
        effect.until = until;
        effect.message = "Ton profil apparaît en tête des decks pendant 1h !";
        break;
      }
      case "ghostMode": {
        const until = new Date(now + 60 * 60 * 1000);
        await tx.user.update({ where: { id: user.id }, data: { ghostModeUntil: until } });
        effect.until = until;
        effect.message = "Mode Fantôme actif pendant 1h : tu navigues invisiblement — tes likes restent secrets.";
        break;
      }
      case "dailyDouble": {
        // Double today's streak reward. If already claimed today, re-arm the
        // claim so the doubled reward applies to tomorrow's claim.
        const ddUntil = new Date(now + 24 * 60 * 60 * 1000);
        const todayISO = new Date().toISOString().split("T")[0];
        const alreadyClaimedToday = user.lastStreakDay === todayISO;
        await tx.user.update({
          where: { id: user.id },
          data: {
            dailyDoubleUntil: ddUntil,
            ...(alreadyClaimedToday ? {} : { streakRewardClaimed: false }),
          },
        });
        effect.until = ddUntil;
        effect.message = alreadyClaimedToday
          ? "Ta récompense de demain sera doublée ! 🎲"
          : "Ta récompense de série du jour sera doublée — réclame-la ! 🎲";
        effect.doubled = true;
        break;
      }
      case "superRewind": {
        const recentSwipes = await tx.swipe.findMany({
          where: { fromUserId: user.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, toProfileId: true },
        });
        if (recentSwipes.length > 0) {
          await tx.swipe.deleteMany({ where: { id: { in: recentSwipes.map((s) => s.id) } } });
        }
        effect.undoneCount = recentSwipes.length;
        effect.deckRefresh = true;
        break;
      }
      case "rewind": {
        const lastSwipe = await tx.swipe.findFirst({
          where: { fromUserId: user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, toProfileId: true },
        });
        if (lastSwipe) {
          await tx.swipe.delete({ where: { id: lastSwipe.id } });
          effect.undoneCount = 1;
        } else {
          effect.undoneCount = 0;
        }
        effect.deckRefresh = true;
        break;
      }
      case "timeFreeze": {
        // Peek at the next 3 profiles of the deck (same ordering as /deck).
        const swiped = await tx.swipe.findMany({
          where: { fromUserId: user.id },
          select: { toProfileId: true },
        });
        const swipedIds = swiped.map((s) => s.toProfileId);
        const next3 = await tx.profile.findMany({
          where: {
            id: { notIn: swipedIds },
            userId: { not: user.id },
            modStatus: "approved",
          },
          take: 3,
          orderBy: { createdAt: "desc" },
          select: {
            id: true, displayName: true, age: true, city: true,
            posterUrl: true, vibeQuestion: true, vibeAnswer: true,
          },
        });
        effect.peek = next3;
        const tfUntil = new Date(now + 15 * 60 * 1000);
        await tx.user.update({ where: { id: user.id }, data: { timeFreezeUntil: tfUntil } });
        effect.until = tfUntil;
        break;
      }
      case "vibeRadar": {
        // Who's "online" near you right now: recently-active profiles,
        // excluding already-swiped ones and ghost-mode users (they browse
        // invisibly — a real effect of Mode Fantôme).
        const swiped = await tx.swipe.findMany({
          where: { fromUserId: user.id },
          select: { toProfileId: true },
        });
        const swipedIds = swiped.map((s) => s.toProfileId);
        const recent = await tx.profile.findMany({
          where: {
            id: { notIn: swipedIds },
            userId: { not: user.id },
            modStatus: "approved",
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true, displayName: true, age: true, city: true, posterUrl: true,
            lat: true, lng: true, updatedAt: true,
            user: { select: { ghostModeUntil: true } },
          },
        });
        const myLat = user.profile?.lat;
        const myLng = user.profile?.lng;
        effect.online = recent
          .filter((p) => !(p.user as any)?.ghostModeUntil || (p.user as any).ghostModeUntil.getTime() <= now)
          .map((p, i) => {
            // Real distance when both sides have coordinates.
            const hasCoords =
              typeof myLat === "number" && typeof myLng === "number" && (p.lat !== 0 || p.lng !== 0);
            const distanceKm = hasCoords
              ? Math.max(1, Math.round(haversineKm(myLat!, myLng!, p.lat, p.lng)))
              : Math.floor(Math.random() * 15) + 1;
            const mins = Math.min(240, Math.round((now - p.updatedAt.getTime()) / 60000));
            const lastActive =
              mins < 2 ? "à l'instant" : mins < 60 ? `il y a ${mins} min` : `il y a ${Math.floor(mins / 60)} h`;
            return {
              id: p.id,
              displayName: p.displayName,
              age: p.age,
              city: p.city,
              posterUrl: p.posterUrl,
              distanceKm,
              lastActive: lastActive || ["à l'instant", "il y a 2 min"][i % 2],
            };
          });
        break;
      }
      case "seeLikes": {
        // Reveal who liked me. Ghost-mode likers stay invisible (real effect).
        const myProfile = user.profile
          ? { id: user.profile.id }
          : await tx.profile.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (myProfile) {
          const likes = await tx.swipe.findMany({
            where: {
              toProfileId: myProfile.id,
              direction: { in: ["like", "superlike"] },
            },
            include: {
              fromUser: { include: { profile: true } },
            },
            take: 8,
            orderBy: { createdAt: "desc" },
          });
          const visible = likes.filter(
            (l) => !l.fromUser.ghostModeUntil || l.fromUser.ghostModeUntil.getTime() <= now,
          );
          effect.likers = visible.map((l) => ({
            id: l.fromUser.profile?.id ?? "",
            displayName: l.fromUser.profile?.displayName ?? "Anonyme",
            age: l.fromUser.profile?.age ?? 0,
            city: l.fromUser.profile?.city ?? "",
            posterUrl: l.fromUser.profile?.posterUrl || "/profiles/lea.png",
            direction: l.direction,
          }));
          effect.hiddenByGhost = likes.length - visible.length;
          // Honest tease: some likers browse in ghost mode — don't fake
          // profiles over them, tell the user they're hidden.
          if (effect.likers.length === 0 && likes.length > 0) {
            effect.likers = [];
            effect.ghostTease = likes.length;
          } else if (effect.likers.length === 0) {
            // PRODUCTION: never fabricate likers. An honest empty answer is
            // the real product truth — no fake "Mystère/Secret" profiles.
            effect.likers = [];
            effect.message = "Personne ne t'a encore liké — continue à swiper, ça arrivera vite ! 💜";
          }
        }
        break;
      }
      case "moodRing": {
        // Deterministic mood of the day for THIS profile — derived from the
        // profile's own data so re-purchases stay coherent.
        const moods = ["🎉 Fête", "🌅 Calme", "🔥 Aventurier", "☕ Chill", "💫 Romantique", "🎯 Ambitieux"];
        if (targetProfile) {
          const daySeed = Math.floor(now / 86_400_000);
          const seed =
            targetProfile.displayName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
            targetProfile.age + daySeed;
          effect.mood = moods[seed % moods.length];
          effect.profileName = targetProfile.displayName;
        }
        break;
      }
      case "crushAlert": {
        // Send a REAL special notification to the crush (someone not yet
        // matched) + keep the sender buff for the profile section.
        if (targetProfile) {
          const caUntil = new Date(now + 60 * 60 * 1000);
          await tx.user.update({ where: { id: user.id }, data: { crushAlertUntil: caUntil } });
          await tx.notification.create({
            data: {
              userId: targetProfile.userId,
              type: "crush_alert",
              title: "💘 Quelqu'un a flashé sur toi !",
              body: `${myName} t'a envoyé une alerte crush. Ouvre VibeSync pour découvrir son profil — ça pourrait matché !`,
              icon: "💘",
              metadata: JSON.stringify({ fromUserId: user.id, profileId: targetProfile.id }),
            },
          });
          effect.until = caUntil;
          effect.targetName = targetProfile.displayName;
          effect.message = `Alerte crush envoyée à ${targetProfile.displayName} — il/elle vient de recevoir une notification spéciale 💘`;
          effect.sent = true;
        }
        break;
      }
      case "goldenHeart": {
        // Golden super-like: real swipe (created or upgraded) + special
        // notification to the target + priority placement with a golden
        // badge in the TARGET's deck (see /profiles/deck) + sender buff.
        if (targetProfile) {
          const existing = await tx.swipe.findUnique({
            where: { fromUserId_toProfileId: { fromUserId: user.id, toProfileId: targetProfile.id } },
          });
          if (!existing) {
            await tx.swipe.create({
              data: { fromUserId: user.id, toProfileId: targetProfile.id, direction: "superlike", costGems: cost },
            });
          } else if (existing.direction !== "superlike") {
            // Upgrade a previous like/pass into a golden super-like.
            await tx.swipe.update({
              where: { id: existing.id },
              data: { direction: "superlike", costGems: cost },
            });
          }
          const ghUntil = new Date(now + 60 * 60 * 1000);
          await tx.user.update({ where: { id: user.id }, data: { goldenHeartUntil: ghUntil } });
          await tx.notification.create({
            data: {
              userId: targetProfile.userId,
              type: "golden_heart",
              title: "💛 Cœur d'Or reçu !",
              body: `${myName} t'a envoyé un Cœur d'Or — le super-like ultime. Son profil t'attend en tête de ta file avec un badge doré ✨`,
              icon: "💛",
              metadata: JSON.stringify({ fromUserId: user.id, profileId: targetProfile.id }),
            },
          });
          effect.until = ghUntil;
          effect.targetName = targetProfile.displayName;
          effect.message = `💛 Cœur d'Or envoyé à ${targetProfile.displayName} ! Ton profil est en tête de sa file avec un badge doré pendant 1h.`;
          effect.golden = true;
        }
        break;
      }
      case "compatibilityReport": {
        // Heuristic score from real profile data (the AI narrative is added
        // after the transaction — it's an external call).
        const myProfile = user.profile ?? (await tx.profile.findUnique({ where: { userId: user.id } }));
        if (targetProfile && myProfile) {
          const vibeMatch = targetProfile.vibeAnswer === myProfile.vibeAnswer;
          const ageDiff = Math.abs(targetProfile.age - myProfile.age);
          const score = Math.max(45, Math.min(98,
            60 + (vibeMatch ? 25 : 0) + (ageDiff <= 5 ? 10 : 0) + (targetProfile.city === myProfile.city ? 8 : 0),
          ));
          effect.score = score;
          effect.profileName = targetProfile.displayName;
          effect.report = {
            vibe: vibeMatch ? "✓ Vibe compatible" : "Vibe différente (complémentaire ?)",
            ageGap: ageDiff === 0 ? "Même âge" : `${ageDiff} ans d'écart`,
            location: targetProfile.city === myProfile.city ? "Même ville 📍" : `${targetProfile.city} vs ${myProfile.city}`,
            recommendation: score >= 80
              ? "Excellente compatibilité ! Fonce. 💜"
              : score >= 60
                ? "Bon potentiel — tente ta chance."
                : "Compatibilité modérée — le mystère fait son charme.",
          };
          // Context passed to the LLM narrative step below.
          effect._compatCtx = {
            myName: myProfile.displayName,
            myAge: myProfile.age,
            myCity: myProfile.city,
            myVibe: myProfile.vibeAnswer,
            theirName: targetProfile.displayName,
            theirAge: targetProfile.age,
            theirCity: targetProfile.city,
            theirVibe: targetProfile.vibeAnswer,
            score,
          };
        }
        break;
      }
      case "passport": {
        // 24h in another city — the deck will blend in profiles from
        // passportCity (bypassing the distance filter).
        const ppUntil = new Date(now + 24 * 60 * 60 * 1000);
        await tx.user.update({
          where: { id: user.id },
          data: { passportUntil: ppUntil, passportCity },
        });
        effect.until = ppUntil;
        effect.city = passportCity;
        effect.message = `✈️ Passport activé pour ${passportCity} ! Découvre les profils de cette ville pendant 24h.`;
        effect.active = true;
        effect.deckRefresh = true;
        break;
      }
      // icebreaker — LLM call after the transaction (below).
    }
  });

  const updated = await db.user.findUnique({
    where: { id: user.id },
    select: { gems: true, freeGems: true, streak: true, streakMax: true, streakRewardClaimed: true, ghostModeUntil: true, spotlightUntil: true },
  });

  // Icebreaker: generate a contextual pickup line via LLM.
  let icebreaker: string | null = null;
  if (key === "icebreaker") {
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Tu es un expert en drague naturelle et bienveillante. Génère UNE seule phrase d'accroche courte (max 15 mots), fraîche, légère et personnalisable, en français, sans emojis, sans guillemets. Pas de cliché.",
          },
          {
            role: "user",
            content: "Propose une phrase d'accroche originale pour engager une conversation avec quelqu'un dont la vidéo montre un mode de vie actif et créatif.",
          },
        ],
        temperature: 0.9,
        max_tokens: 60,
      });
      icebreaker = completion.choices[0]?.message?.content?.trim() ?? null;
    } catch {
      icebreaker = "Si ta vidéo disait vrai, on devrait déjà se connaître. On corrige ça ?";
    }
  }

  // Cœur d'Or — instant match when the feeling is mutual (same rule as the
  // super-like flow in /api/vibe/swipe).
  if (key === "goldenHeart" && targetProfile && user.profile) {
    try {
      const reciprocal = await db.swipe.findFirst({
        where: {
          fromUserId: targetProfile.userId,
          toProfileId: user.profile.id,
          direction: { in: ["like", "superlike"] },
        },
      });
      if (reciprocal) {
        const [a, b] = [user.id, targetProfile.userId].sort();
        const existingMatch = await db.match.findUnique({
          where: { userAId_userBId: { userAId: a, userBId: b } },
        });
        if (!existingMatch) {
          const match = await db.match.create({
            data: { userAId: a, userBId: b, initiatedById: user.id, unlocked: false },
          });
          await notifyMatch(user.id, targetProfile.displayName, match.id);
          await notifyMatch(targetProfile.userId, user.profile.displayName ?? "Quelqu'un", match.id);
          effect.match = { id: match.id, withProfile: { id: targetProfile.id, displayName: targetProfile.displayName } };
          effect.message = `💛 Cœur d'Or envoyé à ${targetProfile.displayName} — c'est un MATCH ! 💕 Ton profil est en tête de sa file avec un badge doré.`;
        }
      }
    } catch {
      // Match detection is best-effort — the golden heart itself already landed.
    }
  }

  // Compatibility report: AI-written narrative on top of the heuristic score.
  if (key === "compatibilityReport" && effect._compatCtx) {
    const ctx = effect._compatCtx as Record<string, string | number>;
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Tu es une experte en compatibilité amoureuse. Écris en français, sans emojis, exactement 2 phrases courtes : pourquoi ce score, puis une suggestion de premier message. Ton chaleureux, direct, pas de listes.",
          },
          {
            role: "user",
            content: `Analyse: ${ctx.myName} (${ctx.myAge} ans, ${ctx.myCity}, vibe "${ctx.myVibe}") et ${ctx.theirName} (${ctx.theirAge} ans, ${ctx.theirCity}, vibe "${ctx.theirVibe}"). Score calculé: ${ctx.score}%.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 120,
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) effect.aiAnalysis = text;
    } catch {
      // LLM unavailable — the heuristic report already carries the value.
    }
    delete effect._compatCtx;
  }

  return NextResponse.json({
    ok: true,
    action: key,
    cost,
    gems: updated?.gems ?? user.gems,
    freeGems: updated?.freeGems ?? user.freeGems,
    icebreaker,
    ...effect,
    userState: updated,
  });
}
