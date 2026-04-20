const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const workOrders = await prisma.workOrder.findMany();
  console.log("Users:", users.length);
  console.log("WorkOrders:", workOrders.length);
  const jsonOrders = await prisma.workOrder.findMany({ include: { technician: true } });
  console.log(JSON.stringify(jsonOrders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
