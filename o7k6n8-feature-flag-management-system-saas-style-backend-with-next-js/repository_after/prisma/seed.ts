import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Create regular user
  const userPassword = await hashPassword('user123');
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
    },
  });

  // Create sample feature flags
  const flag1 = await prisma.featureFlag.upsert({
    where: { key: 'new_dashboard' },
    update: {},
    create: {
      key: 'new_dashboard',
      description: 'Enable new dashboard feature',
      enabled: true,
      rolloutPercentage: 50,
    },
  });

  const flag2 = await prisma.featureFlag.upsert({
    where: { key: 'beta_feature' },
    update: {},
    create: {
      key: 'beta_feature',
      description: 'Beta feature for testing',
      enabled: false,
      rolloutPercentage: 0,
    },
  });

  // Create user override for admin
  await prisma.userOverride.upsert({
    where: {
      userId_flagId: {
        userId: admin.id,
        flagId: flag1.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      flagId: flag1.id,
      enabled: true,
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });