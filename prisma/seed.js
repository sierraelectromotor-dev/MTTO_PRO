const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('1143357681', 10);

  let rootTenant = await prisma.tenant.findFirst({
    where: { name: 'Sistema MTTO Global' }
  });

  if (!rootTenant) {
     rootTenant = await prisma.tenant.create({
      data: {
        name: 'Sistema MTTO Global',
        nit: '000000000-0',
        plan_type: 'PREMIUM',
      }
    });
  }

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@admin.com' },
    update: {
      password: hashedPassword
    },
    create: {
      email: 'superadmin@admin.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
      tenant_id: rootTenant.id
    }
  });

  console.log('Seed exitoso: Tenant Root y Usuario SuperAdmin creados.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
