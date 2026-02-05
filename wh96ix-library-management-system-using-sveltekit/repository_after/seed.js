// Seed script to create admin user
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  try {
    // Create admin user if not exists
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        name: 'Admin User',
        password: hashPassword('admin123'),
        role: 'ADMIN'
      }
    });
    console.log('Admin user seeded successfully');
  } catch (e) {
    console.error('Error seeding admin user:', e);
    // Don't exit on error, might already exist
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
