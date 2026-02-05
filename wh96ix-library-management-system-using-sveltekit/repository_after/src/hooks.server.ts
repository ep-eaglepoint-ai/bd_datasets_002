import type { Handle } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';

const prisma = new PrismaClient();
const SESSION_COOKIE = 'lms_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

function sign(value: string) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function serializeSession(userId: number, role: 'ADMIN' | 'BORROWER') {
  const payload = `${userId}:${role}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function parseSession(value: string | undefined) {
  if (!value) return null;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const valid = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return null;
  const [idStr, roleStr] = payload.split(':');
  const id = Number(idStr);
  if (!id || !roleStr) return null;
  if (roleStr !== 'ADMIN' && roleStr !== 'BORROWER') return null;
  return { id, role: roleStr as 'ADMIN' | 'BORROWER' };
}

export const handle: Handle = async ({ event, resolve }) => {
  const rawCookie = event.cookies.get(SESSION_COOKIE);
  const session = parseSession(rawCookie);

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, name: true, role: true }
    });
    if (user) {
      event.locals.user = user;
    } else {
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
    }
  }

  event.locals.prisma = prisma;

  const response = await resolve(event);
  return response;
};

