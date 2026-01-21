// topupTransaction.dal.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://user:pass@localhost:5432/db' } } });

export async function topupTransactionDal(props: any) {
  if (props.method === 'get paginate') {
    const { page, limit, filters } = props;
    const skip = (page - 1) * limit; 
    const transactions = await prisma.topUpTransaction.findMany({
      skip,
      take: limit,
      where: filters,
      orderBy: { id: 'desc' },
    });
    const totalDocs = await prisma.topUpTransaction.count({ where: filters });
    return {
      statusCode: 200,
      body: { data: transactions, totalDocs, page, limit },
    };
  }
}