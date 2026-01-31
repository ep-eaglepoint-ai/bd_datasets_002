import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteHandler(req: NextRequest & { user: any }, { params }: { params: { id: string; overrideId: string } }) {
  try {
    const { id: flagId, overrideId } = params;

    // Check if override exists
    const override = await prisma.userOverride.findUnique({
      where: { id: overrideId },
      include: {
        user: true,
        flag: true,
      },
    });

    if (!override) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    // Delete the override
    await prisma.userOverride.delete({
      where: { id: overrideId },
    });

    // Audit log for override deletion
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        flagId: flagId,
        action: 'OVERRIDE_DELETE',
        oldValue: {
          userId: override.userId,
          userEmail: override.user.email,
          enabled: override.enabled,
          flagKey: override.flag.key,
        },
        newValue: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete override error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const DELETE = withAuth(deleteHandler, 'ADMIN');
