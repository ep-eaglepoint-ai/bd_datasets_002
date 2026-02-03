import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getHandler(req: NextRequest & { user: any }) {
  try {
    const { searchParams } = new URL(req.url);
    const flagId = searchParams.get('flagId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    
    if (flagId) {
      where.flagId = flagId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = action;
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true },
          },
          flag: {
            select: { id: true, key: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ 
      auditLogs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler, 'ADMIN');
