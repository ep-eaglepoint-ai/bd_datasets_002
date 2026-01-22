import { prisma } from "../repository_after/lib/prisma";

export async function updateCustomerCapAndAccess(query: any, data: any) {
  const { caps } = data;
  await prisma.$transaction(async (tx) => {
    for (const cap of caps) {
      await tx.cap.upsert({
        where: { id: cap.id || 0 },
        create: cap,
        update: cap,
      });
    }
  });
  return { updated: true };
}
