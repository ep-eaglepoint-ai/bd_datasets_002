import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

  if (process.env.NODE_ENV === "development") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

export const prisma = getPrismaClient();

export default prisma;
