import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const matches = await p.match.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { userA: { select: { name: true } }, userB: { select: { name: true } } } });
  console.log("=== RECENT MATCHES ===");
  matches.forEach(m => console.log(`${m.id} | ${m.userA.name} <-> ${m.userB.name} | initiatedBy: ${m.initiatedById} | unlocked: ${m.unlocked} | createdAt: ${m.createdAt.toISOString()}`));
  for (const m of matches.slice(0, 3)) {
    const msgs = await p.message.findMany({ where: { matchId: m.id }, orderBy: { createdAt: 'asc' } });
    console.log(`\n=== MESSAGES for match ${m.id.slice(0, 8)} (${msgs.length}) ===`);
    msgs.forEach(x => console.log(`${x.createdAt.toISOString()} | sender:${x.senderId.slice(0, 8)} | type:${x.type} | boosted:${x.boosted} | "${x.text?.substring(0, 40)}"`));
  }
}
main().catch(console.error).finally(() => p.$disconnect());
