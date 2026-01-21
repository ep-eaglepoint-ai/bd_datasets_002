// accessServiceList.dal.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasources: { db: { url: 'file:./dev.db' } } });

export async function accessServiceListDal(params: any) {
  if (params.method === 'get') {
    return await prisma.accessServiceList.findMany(); // Faulty scan O(n)
  }

}