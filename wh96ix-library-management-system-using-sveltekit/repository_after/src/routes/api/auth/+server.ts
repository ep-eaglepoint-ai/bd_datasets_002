import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { hashPassword, verifyPassword, type Role } from '$lib/server/auth';
import { createHmac, timingSafeEqual } from 'crypto';

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

function makeSessionCookie(event: Parameters<RequestHandler>[0], userId: number, role: Role) {
  const signed = serializeSession(userId, role);
  event.cookies.set(SESSION_COOKIE, signed, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 60 * 60 * 8
  });
}

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const { prisma } = locals;
  if (!prisma) throw error(500, 'Database not initialized');
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== 'string') {
    throw error(400, 'Invalid request');
  }

  if (body.action === 'login') {
    const { email, password } = body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw error(400, 'Email is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw error(400, 'Password must be at least 6 characters');
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !(await verifyPassword(password, user.password))) {
      throw error(401, 'Invalid credentials');
    }
    makeSessionCookie({ cookies } as any, user.id, user.role as 'ADMIN' | 'BORROWER');
    return json({ id: user.id, email: user.email, name: user.name, role: user.role });
  }

  if (body.action === 'register') {
    const { email, password, name } = body;
    
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw error(400, 'Email is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw error(400, 'Password must be at least 6 characters');
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw error(400, 'Name is required');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      throw error(400, 'Invalid email format');
    }
    
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) throw error(409, 'User with this email already exists');
    
    // Assign ADMIN role if email contains "admin" (case-insensitive)
    const role = normalizedEmail.includes('admin') ? 'ADMIN' : 'BORROWER';
    
    try {
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          password: await hashPassword(password),
          role: role
        }
      });
      makeSessionCookie({ cookies } as any, user.id, user.role as 'ADMIN' | 'BORROWER');
      return json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw error(409, 'User with this email already exists');
      }
      throw error(500, 'Failed to create user');
    }
  }

  if (body.action === 'logout') {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    return json({ ok: true });
  }

  throw error(400, 'Unknown action');
};

export const GET: RequestHandler = async ({ locals }) => {
  if (locals.user) {
    return json({ id: locals.user.id, email: locals.user.email, name: locals.user.name, role: locals.user.role });
  }
  return json(null);
};

