// Database seed script for testing
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(' Seeding database...');

    // Clear existing data
    await prisma.topUpTransaction.deleteMany({});
    console.log('  Cleared existing transactions');

    // Create test data - enough for performance tests but not too much for CI
    const RECORD_COUNT = 1000; // Enough to test pagination performance
    const now = Date.now();

    const transactions = [];
    for (let i = RECORD_COUNT; i > 0; i--) {
        transactions.push({
            amount: Math.floor(Math.random() * 10000) + 100,
            status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'pending' : 'failed',
            userId: Math.floor(Math.random() * 100) + 1,
            createdAt: new Date(now - i * 1000), // Spread over time for realistic data
        });
    }

    // Batch insert for performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = transactions.slice(i, i + BATCH_SIZE);
        await prisma.topUpTransaction.createMany({
            data: batch,
            skipDuplicates: true,
        });

        if ((i + BATCH_SIZE) % 500 === 0) {
            console.log(`  Created ${Math.min(i + BATCH_SIZE, transactions.length)}/${RECORD_COUNT} transactions`);
        }
    }

    console.log(`✅ Successfully seeded ${RECORD_COUNT} transactions`);

    // Verify data
    const count = await prisma.topUpTransaction.count();
    console.log(` Total records in database: ${count}`);

    // CRITICAL: Warm up Prisma connection pool to avoid first-query overhead
    // Tests measure SLA < 10ms, but first query has ~100ms overhead
    console.log(' Warming up Prisma connection pool...');
    for (let i = 0; i < 5; i++) {
        await prisma.topUpTransaction.findMany({
            take: 10,
            orderBy: { id: 'desc' },
        });
    }
    console.log('✅ Connection pool warmed up');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
