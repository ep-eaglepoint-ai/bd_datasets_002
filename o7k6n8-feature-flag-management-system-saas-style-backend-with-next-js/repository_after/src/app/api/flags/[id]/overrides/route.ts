import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getHandler(req: NextRequest & { user: any }, { params }: { params: { id: string } }) {
  try {
    const overrides = await prisma.userOverride.findMany({
      where: { flagId: params.id },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    return NextResponse.json({ overrides });
  } catch (error) {
    console.error('Get overrides error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function postHandler(req: NextRequest & { user: any }, { params }: { params: { id: string } }) {
  try {
    const { userId, enabled } = await req.json();

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'userId and enabled are required' }, { status: 400 });
    }

    // Check if flag exists
    const flag = await prisma.featureFlag.findUnique({ where: { id: params.id } });
    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const override = await prisma.userOverride.upsert({
      where: {
        userId_flagId: {
          userId,
          flagId: params.id,
        },
      },
      update: { enabled },
      create: {
        userId,
        flagId: params.id,
        enabled,
      },
    });

    return NextResponse.json({ override }, { status: 201 });
  } catch (error) {
    console.error('Create override error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler, 'ADMIN');
export const POST = withAuth(postHandler, 'ADMIN');