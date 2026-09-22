import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({ select: { id: true, name: true, phone: true, pinHash: true, role: true, gems: true, freeGems: true, onboardingComplete: true } });
  users.forEach(u => {
    let pin = "?";
    try { pin = Buffer.from(u.pinHash, 'base64').toString().replace('vibe::', ''); } catch {}
    console.log(`${u.name} | ${u.phone} | PIN:${pin} | ${u.role} | gems:${u.gems} free:${u.freeGems} | onboarding:${u.onboardingComplete}`);
  });
}
main().catch(console.error).finally(() => p.$disconnect());
