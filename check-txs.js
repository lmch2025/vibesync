const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const gemTxs = await prisma.gemTx.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  console.log("gemTxs:", gemTxs)
  const giftTxs = await prisma.giftTx.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  console.log("giftTxs:", giftTxs)
}
main().finally(() => prisma.$disconnect())
