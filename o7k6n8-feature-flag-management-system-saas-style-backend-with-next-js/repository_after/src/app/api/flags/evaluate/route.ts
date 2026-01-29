import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { getEvaluatedFlagsForUser } from '@/lib/featureFlags';

async function getHandler(req: NextRequest & { user: any }) {
  try {
    const flags = await getEvaluatedFlagsForUser(req.user.id);
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Evaluate flags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);