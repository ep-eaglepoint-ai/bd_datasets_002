import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { verifyPassword, hashPassword } from '$lib/server/auth';

function requireAuth(locals: App.Locals) {
  if (!locals.user) throw error(401, 'Authentication required');
}

export const GET: RequestHandler = async ({ locals }) => {
  requireAuth(locals);
  const { user } = locals;
  return json({ id: user!.id, email: user!.email, name: user!.name, role: user!.role });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
  requireAuth(locals);
  const { prisma, user } = locals;
  const body = await request.json().catch(() => null);
  if (!body) throw error(400, 'Invalid JSON');

  const { name, email } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw error(400, 'Name cannot be empty');
    }
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) {
      throw error(400, 'Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      throw error(400, 'Invalid email format');
    }
    // Check if email is already used by another user
    const emailExists = await prisma.user.findFirst({
      where: { email: normalizedEmail, id: { not: user!.id } }
    });
    if (emailExists) {
      throw error(409, 'Email already in use');
    }
  }

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();

    const updated = await prisma.user.update({
      where: { id: user!.id },
      data: updateData
    });

    return json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role });
  } catch (e: any) {
    if (e.code === 'P2025') {
      throw error(404, 'User not found');
    }
    throw error(500, 'Failed to update profile');
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  requireAuth(locals);
  const { prisma, user } = locals;
  const body = await request.json().catch(() => null);
  if (!body) throw error(400, 'Invalid JSON');

  const { currentPassword, newPassword } = body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    throw error(400, 'Current password is required');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw error(400, 'New password must be at least 6 characters');
  }

  // Verify current password
  const dbUser = await prisma.user.findUnique({ where: { id: user!.id } });
  if (!dbUser) throw error(404, 'User not found');

  const isValid = await verifyPassword(currentPassword, dbUser.password);
  if (!isValid) {
    throw error(401, 'Current password is incorrect');
  }

  try {
    await prisma.user.update({
      where: { id: user!.id },
      data: { password: await hashPassword(newPassword) }
    });

    return json({ ok: true });
  } catch (e: any) {
    throw error(500, 'Failed to change password');
  }
};
