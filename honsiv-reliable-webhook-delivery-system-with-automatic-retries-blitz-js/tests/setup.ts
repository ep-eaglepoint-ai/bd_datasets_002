import { beforeAll, afterAll, beforeEach } from "vitest"
import db from "db"

// Note: Prisma Client must be generated in repository_after before running tests
// Run: cd repository_after && npx prisma generate
// Use the same db instance as the application to ensure consistency
export const prisma = db

// Helper to ensure data is committed and visible
// This forces Prisma to commit any pending transactions and ensures data is visible
export async function ensureCommitted() {
  // Force a commit by running a simple query that touches the database
  await prisma.$queryRaw`SELECT 1`
  // Small delay to ensure database has processed the commit
  await new Promise((resolve) => setTimeout(resolve, 10))
}

beforeAll(async () => {
  // Setup: Ensure database is connected
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clean up test data before each test
  // Order matters: delete child records before parent records to avoid foreign key constraints
  // Delete in the correct order, with retries to handle foreign key constraints
  let retries = 3
  while (retries > 0) {
    try {
      // Delete in order: attempts -> deliveries -> endpoints
      await prisma.webhookAttempt.deleteMany({})
      await prisma.webhookDelivery.deleteMany({})
      await prisma.webhookEndpoint.deleteMany({})
      break // Success, exit loop
    } catch (error) {
      retries--
      if (retries === 0) {
        // Last attempt failed, try with individual deletes
        try {
          await prisma.webhookAttempt.deleteMany({})
        } catch (e) {
          // Ignore
        }
        try {
          await prisma.webhookDelivery.deleteMany({})
        } catch (e) {
          // Ignore
        }
        try {
          await prisma.webhookEndpoint.deleteMany({})
        } catch (e) {
          // Ignore
        }
      } else {
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
  }
  
  // Ensure cleanup is committed
  await ensureCommitted()
})

