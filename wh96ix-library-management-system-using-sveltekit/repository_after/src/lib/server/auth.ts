// @ts-expect-error - bcryptjs types not available, but module exists
import bcrypt from 'bcryptjs';

export type Role = 'ADMIN' | 'BORROWER';

export async function hashPassword(password: string): Promise<string> {
  // Use sync version wrapped in Promise for compatibility
  return Promise.resolve(bcrypt.hashSync(password, 10));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Use sync version wrapped in Promise for compatibility
  return Promise.resolve(bcrypt.compareSync(password, hash));
}

