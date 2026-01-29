import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteHandler(req: NextRequest & { user: any }, { params }: { params: { id: string; overrideId: string } }) {
  try {
    const override = await prisma.userOverride.findUnique({
      where: { id: params.overrideId },
    });

    if (!override || override.flagId !== params.id) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    await prisma.userOverride.delete({
      where: { id: params.overrideId },
    });

    return NextResponse.json({ message: 'Override deleted successfully' });
  } catch (error) {
    console.error('Delete override error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteHandler, 'ADMIN');