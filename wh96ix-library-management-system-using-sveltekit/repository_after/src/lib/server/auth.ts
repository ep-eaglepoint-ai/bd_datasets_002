import { createHash, timingSafeEqual } from 'crypto';

export type Role = 'ADMIN' | 'BORROWER';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const candidate = hashPassword(password);
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

