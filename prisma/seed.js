// prisma/seed.js — VibeSync initial data seed for Neon PostgreSQL
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding VibeSync database on Neon...');

  // ── Settings ────────────────────────────────────────────────────────────
  const settings = [
    { key: 'defaultRadiusKm',         value: '50' },
    { key: 'maxMessagesBeforeReply',   value: '1' },
    { key: 'platformCommission',       value: '0.30' }, // 30 %
    { key: 'withdrawalThresholdEur',   value: '10' },   // minimum 10 €
    { key: 'welcomeGems',              value: '25' },
    { key: 'superlikeCost',            value: '5' },
    { key: 'icebreakerCost',           value: '3' },
    { key: 'seeLikesCost',             value: '10' },
    { key: 'messageboostCost',         value: '5' },
    { key: 'boostCost',                value: '20' },
    { key: 'passportCost',             value: '15' },
    { key: 'ghostmodeCost',            value: '30' },
    { key: 'spotlightCost',            value: '25' },
    { key: 'rewindCost',               value: '8' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where:  { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`  ✅ ${settings.length} Settings upserted`);

  // ── Gifts catalog ────────────────────────────────────────────────────────
  const gifts = [
    { key: 'rose',        name: 'Rose',          emoji: '🌹', gemCost: 10,  eurValueCents: 50,  popular: true  },
    { key: 'fire',        name: 'Feu',            emoji: '🔥', gemCost: 20,  eurValueCents: 100, popular: true  },
    { key: 'diamond',     name: 'Diamant',        emoji: '💎', gemCost: 50,  eurValueCents: 250, popular: false },
    { key: 'crown',       name: 'Couronne',       emoji: '👑', gemCost: 100, eurValueCents: 500, popular: false },
    { key: 'star',        name: 'Étoile',         emoji: '⭐', gemCost: 15,  eurValueCents: 75,  popular: true  },
    { key: 'heart',       name: 'Cœur',           emoji: '❤️', gemCost: 5,   eurValueCents: 25,  popular: true  },
    { key: 'kiss',        name: 'Bisou',          emoji: '💋', gemCost: 8,   eurValueCents: 40,  popular: false },
    { key: 'champagne',   name: 'Champagne',      emoji: '🍾', gemCost: 30,  eurValueCents: 150, popular: false },
    { key: 'unicorn',     name: 'Licorne',        emoji: '🦄', gemCost: 75,  eurValueCents: 375, popular: false },
    { key: 'trophy',      name: 'Trophée',        emoji: '🏆', gemCost: 200, eurValueCents: 1000,popular: false },
  ];

  for (const g of gifts) {
    await prisma.gift.upsert({
      where:  { key: g.key },
      update: g,
      create: g,
    });
  }
  console.log(`  ✅ ${gifts.length} Gifts upserted`);

  // ── Exchange Rates (seed — static baseline, refreshed by cron in prod) ──
  const rates = [
    { currency: 'EUR', rate: 1.0    },
    { currency: 'USD', rate: 1.09   },
    { currency: 'XAF', rate: 655.96 },
    { currency: 'GBP', rate: 0.86   },
    { currency: 'CAD', rate: 1.47   },
    { currency: 'JPY', rate: 163.5  },
    { currency: 'NGN', rate: 1750   },
    { currency: 'GHS', rate: 16.8   },
    { currency: 'MAD', rate: 10.9   },
    { currency: 'TND', rate: 3.35   },
    { currency: 'CHF', rate: 0.97   },
    { currency: 'AUD', rate: 1.66   },
  ];

  for (const r of rates) {
    await prisma.exchangeRate.upsert({
      where:  { currency: r.currency },
      update: { rate: r.rate },
      create: r,
    });
  }
  console.log(`  ✅ ${rates.length} ExchangeRates upserted`);

  console.log('\n🎉 Neon DB seed complete! VibeSync is ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
