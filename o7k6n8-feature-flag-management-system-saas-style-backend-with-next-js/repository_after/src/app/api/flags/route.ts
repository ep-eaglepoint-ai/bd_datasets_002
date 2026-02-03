import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getHandler(req: NextRequest & { user: any }) {
  try {
    const flags = await prisma.featureFlag.findMany({
      include: {
        overrides: true,
      },
    });
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Get flags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function postHandler(req: NextRequest & { user: any }) {
  try {
    const { key, description, enabled, rolloutPercentage } = await req.json();

    if (!key || !description) {
      return NextResponse.json({ error: 'Key and description are required' }, { status: 400 });
    }

    if (rolloutPercentage < 0 || rolloutPercentage > 100) {
      return NextResponse.json({ error: 'Rollout percentage must be between 0 and 100' }, { status: 400 });
    }

    // Check if key already exists
    const existingFlag = await prisma.featureFlag.findUnique({ where: { key } });
    if (existingFlag) {
      return NextResponse.json({ error: 'Flag key already exists' }, { status: 400 });
    }

    const flag = await prisma.featureFlag.create({
      data: {
        key,
        description,
        enabled: enabled ?? false,
        rolloutPercentage: rolloutPercentage ?? 0,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        flagId: flag.id,
        action: 'CREATE',
        newValue: {
          key: flag.key,
          description: flag.description,
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
        },
      },
    });

    return NextResponse.json({ flag }, { status: 201 });
  } catch (error) {
    console.error('Create flag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler, 'ADMIN');
export const POST = withAuth(postHandler, 'ADMIN');