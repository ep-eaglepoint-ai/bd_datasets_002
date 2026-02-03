import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
  };
}

export async function withAuth(
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>,
  requiredRole?: 'ADMIN' | 'USER'
) {
  return async (req: NextRequest, context: any) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (requiredRole && user.role !== requiredRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}