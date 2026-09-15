const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, gems: true, freeGems: true, streak: true, walletEurCents: true }
  })
  console.log("Users:", users)
}
main().finally(() => prisma.$disconnect())
