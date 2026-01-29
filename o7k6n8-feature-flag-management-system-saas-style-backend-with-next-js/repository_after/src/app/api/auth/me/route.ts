import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

async function getHandler(req: NextRequest & { user: any }) {
  return NextResponse.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
}

export const GET = withAuth(getHandler);