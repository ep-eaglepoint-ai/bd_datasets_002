import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../src/lib/auth';

describe('Authentication utilities', () => {
  describe('Password hashing', () => {
    it('should hash password', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword('wrongpassword', hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'USER' as const,
    };

    it('should generate token', () => {
      const token = generateToken(testUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid token', () => {
      const token = generateToken(testUser);
      const decoded = verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.id).toBe(testUser.id);
      expect(decoded?.email).toBe(testUser.email);
      expect(decoded?.role).toBe(testUser.role);
    });

    it('should reject invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });
});
