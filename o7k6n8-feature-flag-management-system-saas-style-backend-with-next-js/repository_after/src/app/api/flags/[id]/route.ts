import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getHandler(req: NextRequest & { user: any }, { params }: { params: { id: string } }) {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { id: params.id },
      include: {
        overrides: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    return NextResponse.json({ flag });
  } catch (error) {
    console.error('Get flag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function putHandler(req: NextRequest & { user: any }, { params }: { params: { id: string } }) {
  try {
    const { description, enabled, rolloutPercentage } = await req.json();

    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      return NextResponse.json({ error: 'Rollout percentage must be between 0 and 100' }, { status: 400 });
    }

    const oldFlag = await prisma.featureFlag.findUnique({ where: { id: params.id } });
    if (!oldFlag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    const flag = await prisma.featureFlag.update({
      where: { id: params.id },
      data: {
        description,
        enabled,
        rolloutPercentage,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        flagId: flag.id,
        action: 'UPDATE',
        oldValue: {
          description: oldFlag.description,
          enabled: oldFlag.enabled,
          rolloutPercentage: oldFlag.rolloutPercentage,
        },
        newValue: {
          description: flag.description,
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
        },
      },
    });

    return NextResponse.json({ flag });
  } catch (error) {
    console.error('Update flag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function deleteHandler(req: NextRequest & { user: any }, { params }: { params: { id: string } }) {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { id: params.id } });
    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    await prisma.featureFlag.delete({ where: { id: params.id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        flagId: params.id,
        action: 'DELETE',
        oldValue: {
          key: flag.key,
          description: flag.description,
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
        },
      },
    });

    return NextResponse.json({ message: 'Flag deleted successfully' });
  } catch (error) {
    console.error('Delete flag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler, 'ADMIN');
export const PUT = withAuth(putHandler, 'ADMIN');
export const DELETE = withAuth(deleteHandler, 'ADMIN');