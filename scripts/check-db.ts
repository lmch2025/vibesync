import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const settings = await p.setting.findMany();
  console.log("=== ALL SETTINGS ===");
  settings.forEach(s => console.log(`${s.key} = ${s.value}`));
  const recentTxs = await p.gemTx.findMany({ orderBy: { createdAt: 'desc' }, take: 15, include: { user: { select: { name: true } } } });
  console.log("\n=== RECENT 15 GEM TRANSACTIONS ===");
  recentTxs.forEach(t => console.log(`${t.createdAt.toISOString()} | ${t.user.name} | ${t.delta} | ${t.reason} | eur:${t.eurPaidCents}`));
  const recentGifts = await p.giftTx.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { gift: true, sender: { select: { name: true } }, receiver: { select: { name: true } } } });
  console.log("\n=== RECENT 10 GIFT TRANSACTIONS ===");
  recentGifts.forEach(g => console.log(`${g.createdAt.toISOString()} | ${g.sender.name} -> ${g.receiver.name} | ${g.gift.name} (${g.gift.gemCost} gems)`));
}
main().catch(console.error).finally(() => p.$disconnect());
