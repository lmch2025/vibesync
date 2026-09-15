// Vivilov seed — populates demo profiles, gifts, exchange rates, admin.
// Run with: bun run scripts/seed.ts
import { PrismaClient } from "@prisma/client";
import { GIFTS, FALLBACK_RATES, WELCOME_GEMS } from "../src/lib/vibe/constants";

const db = new PrismaClient();

const PROFILES = [
  {
    displayName: "Léa",
    age: 24,
    city: "Paris",
    bio: "Danseuse le jour, foodie la nuit. Cherche quelqu'un qui sait tenir une conversation et une fourchette. 🍷",
    videoUrl: "/profiles/lea.png",
    posterUrl: "/profiles/lea.png",
    gender: "f",
    lookingFor: "all",
    lat: 48.8566,
    lng: 2.3522,
    vibeQuestion: "Plage ou Montagne ?",
    vibeAnswer: "plage",
  },
  {
    displayName: "Marco",
    age: 27,
    city: "Lyon",
    bio: "Barista & guitariste. Je collectionne les vinyles et les mauvaises blagues. Swipe droite si tu aimes le jazz. 🎷",
    videoUrl: "/profiles/marco.png",
    posterUrl: "/profiles/marco.png",
    gender: "m",
    lookingFor: "all",
    lat: 45.764,
    lng: 4.8357,
    vibeQuestion: "Chien ou Chat ?",
    vibeAnswer: "chien",
  },
  {
    displayName: "Sofia",
    age: 26,
    city: "Marseille",
    bio: "Architecte & surfeuse du dimanche. La mer, le soleil, et un bon livre = mon dimanche parfait. ☀️🌊",
    videoUrl: "/profiles/sofia.png",
    posterUrl: "/profiles/sofia.png",
    gender: "f",
    lookingFor: "all",
    lat: 43.2965,
    lng: 5.3698,
    vibeQuestion: "Plage ou Montagne ?",
    vibeAnswer: "plage",
  },
  {
    displayName: "Yann",
    age: 29,
    city: "Bordeaux",
    bio: "Éditeur & bouquinophile. Je te conseillerai un livre avant un resto. Désolé pas désolé. 📚",
    videoUrl: "/profiles/yann.png",
    posterUrl: "/profiles/yann.png",
    gender: "m",
    lookingFor: "all",
    lat: 44.8378,
    lng: -0.5792,
    vibeQuestion: "Café ou Thé ?",
    vibeAnswer: "cafe",
  },
  {
    displayName: "Aria",
    age: 25,
    city: "Lille",
    bio: "Graphiste & street-art addict. Mes week-ends se résument à expo + brunch + balade. Toi ? 🎨",
    videoUrl: "/profiles/aria.png",
    posterUrl: "/profiles/aria.png",
    gender: "f",
    lookingFor: "all",
    lat: 50.6292,
    lng: 3.0573,
    vibeQuestion: "Ville ou Nature ?",
    vibeAnswer: "ville",
  },
  {
    displayName: "Tom",
    age: 28,
    city: "Nantes",
    bio: "Trail runner & photographe amateur. Je cours après le lever de soleil. Littéralement. 🏃‍♂️📷",
    videoUrl: "/profiles/tom.png",
    posterUrl: "/profiles/tom.png",
    gender: "m",
    lookingFor: "all",
    lat: 47.2184,
    lng: -1.5536,
    vibeQuestion: "Aventure ou Confort ?",
    vibeAnswer: "aventure",
  },
];

async function main() {
  console.log("Seeding Vivilov...");

  // 1. Gifts catalog
  for (const g of GIFTS) {
    await db.gift.upsert({
      where: { key: g.key },
      update: {
        name: g.name,
        emoji: g.emoji,
        gemCost: g.gemCost,
        eurValueCents: g.eurValueCents,
        popular: !!g.popular,
      },
      create: {
        key: g.key,
        name: g.name,
        emoji: g.emoji,
        gemCost: g.gemCost,
        eurValueCents: g.eurValueCents,
        popular: !!g.popular,
      },
    });
  }
  console.log(`✓ ${GIFTS.length} gifts`);

  // 2. Exchange rates
  for (const [currency, rate] of Object.entries(FALLBACK_RATES)) {
    await db.exchangeRate.upsert({
      where: { currency },
      update: { rate, fetchedAt: new Date() },
      create: { currency, rate, fetchedAt: new Date() },
    });
  }
  console.log(`✓ ${Object.keys(FALLBACK_RATES).length} exchange rates`);

  // 3. Demo profiles (idempotent by phone)
  for (const p of PROFILES) {
    const phone = `+3300000${String(PROFILES.indexOf(p)).padStart(2, "0")}00`;
    const existing = await db.user.findUnique({ where: { phone }, include: { profile: true } });
    if (existing?.profile) {
      await db.profile.update({
        where: { id: existing.profile.id },
        data: {
          displayName: p.displayName,
          age: p.age,
          city: p.city,
          bio: p.bio,
          videoUrl: p.videoUrl,
          posterUrl: p.posterUrl,
          gender: p.gender,
          lookingFor: p.lookingFor,
          lat: p.lat,
          lng: p.lng,
          vibeQuestion: p.vibeQuestion,
          vibeAnswer: p.vibeAnswer,
          modStatus: "approved",
        },
      });
      continue;
    }
    const user = await db.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        name: p.displayName,
        currency: "EUR",
        country: "FR",
        gems: WELCOME_GEMS,
        verified: true,
        profile: {
          create: {
            displayName: p.displayName,
            age: p.age,
            city: p.city,
            bio: p.bio,
            videoUrl: p.videoUrl,
            posterUrl: p.posterUrl,
            gender: p.gender,
            lookingFor: p.lookingFor,
            lat: p.lat,
            lng: p.lng,
            vibeQuestion: p.vibeQuestion,
            vibeAnswer: p.vibeAnswer,
            modStatus: "approved",
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✓ profile ${user.profile?.displayName} (${phone})`);
  }

  // 4. Admin user
  const adminPhone = "+3300000009";
  await db.user.upsert({
    where: { phone: adminPhone },
    update: { role: "admin", verified: true },
    create: {
      phone: adminPhone,
      role: "admin",
      name: "Admin Vivilov",
      currency: "EUR",
      country: "FR",
      gems: 99999,
      verified: true,
    },
  });
  console.log("✓ admin user");

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
