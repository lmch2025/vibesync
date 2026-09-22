import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const m = await p.match.findFirst({ where: { id: "cmu3ynryd0005jp0487lmmhnz" } });
  if (!m) return console.log("match not found");
  const msgs = await p.message.findMany({ where: { matchId: m.id }, orderBy: { createdAt: 'asc' } });
  console.log(`Match unlocked: ${m.unlocked}, initiatedBy: ${m.initiatedById}`);
  console.log(`Total messages: ${msgs.length}`);
  msgs.forEach(x => console.log(`${x.createdAt.toISOString()} | sender:${x.senderId.slice(0,8)} | type:${x.type} | "${x.text?.substring(0, 30)}"`));
}
main().catch(console.error).finally(() => p.$disconnect());
