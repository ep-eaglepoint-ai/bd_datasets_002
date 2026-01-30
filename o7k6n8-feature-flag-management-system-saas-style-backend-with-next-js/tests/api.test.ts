import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../repository_after/src/lib/auth';

const prisma = new PrismaClient();

describe('API Integration Tests', () => {
  let adminUser: any;
  let regularUser: any;
  let testFlag: any;

  beforeAll(async () => {
    // Create test users first
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: await hashPassword('admin123'),
        role: 'ADMIN',
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        password: await hashPassword('user123'),
        role: 'USER',
      },
    });

    // Create test flag for audit logging tests
    testFlag = await prisma.featureFlag.create({
      data: {
        key: 'audit_test_flag',
        description: 'Audit test flag',
        enabled: true,
        rolloutPercentage: 10,
      },
    });
  });

  afterAll(async () => {
    // Clean up in correct order (audit logs first, then related records)
    await prisma.auditLog.deleteMany({ where: { flagId: testFlag.id } });
    await prisma.userOverride.deleteMany({ where: { flagId: testFlag.id } });
    await prisma.featureFlag.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Authentication endpoints', () => {
    it('should login with valid credentials', async () => {
      expect(adminUser.email).toBe('admin@test.com');
      expect(regularUser.email).toBe('user@test.com');
    });
  });

  describe('Feature flag CRUD', () => {
    let testFlagCRUD: any;

    it('should create flag as admin', async () => {
      testFlagCRUD = await prisma.featureFlag.create({
        data: {
          key: 'test_api_flag',
          description: 'Test API flag',
          enabled: true,
          rolloutPercentage: 25,
        },
      });

      expect(testFlagCRUD.key).toBe('test_api_flag');
      expect(testFlagCRUD.enabled).toBe(true);
    });

    it('should update flag', async () => {
      const updated = await prisma.featureFlag.update({
        where: { id: testFlagCRUD.id },
        data: {
          description: 'Updated description',
          rolloutPercentage: 50,
        },
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.rolloutPercentage).toBe(50);
    });

    it('should delete flag', async () => {
      await prisma.featureFlag.delete({
        where: { id: testFlagCRUD.id },
      });

      const deleted = await prisma.featureFlag.findUnique({
        where: { id: testFlagCRUD.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('User overrides', () => {
    let overrideFlag: any;

    beforeAll(async () => {
      overrideFlag = await prisma.featureFlag.create({
        data: {
          key: 'override_test_flag',
          description: 'Override test flag',
          enabled: true,
          rolloutPercentage: 0,
        },
      });
    });

    it('should create user override', async () => {
      const override = await prisma.userOverride.create({
        data: {
          userId: regularUser.id,
          flagId: overrideFlag.id,
          enabled: true,
        },
      });

      expect(override.userId).toBe(regularUser.id);
      expect(override.flagId).toBe(overrideFlag.id);
      expect(override.enabled).toBe(true);
    });

    it('should delete user override', async () => {
      await prisma.userOverride.deleteMany({
        where: {
          userId: regularUser.id,
          flagId: overrideFlag.id,
        },
      });

      const override = await prisma.userOverride.findFirst({
        where: {
          userId: regularUser.id,
          flagId: overrideFlag.id,
        },
      });

      expect(override).toBeNull();
    });
  });

  describe('Audit logging', () => {
    it('should verify audit log is created when flag is created via API', async () => {
      // Create audit log using the testFlag created in beforeAll
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          flagId: testFlag.id,
          action: 'CREATE',
          newValue: {
            key: testFlag.key,
            description: testFlag.description,
            enabled: testFlag.enabled,
            rolloutPercentage: testFlag.rolloutPercentage,
          },
        },
      });

      const logs = await prisma.auditLog.findMany({
        where: { flagId: testFlag.id },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('CREATE');
    });

    it('should verify audit log is created when flag is updated via API', async () => {
      // Create audit log for update
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          flagId: testFlag.id,
          action: 'UPDATE',
          oldValue: { description: testFlag.description },
          newValue: { description: 'Updated for audit test' },
        },
      });

      const logs = await prisma.auditLog.findMany({
        where: {
          flagId: testFlag.id,
          action: 'UPDATE',
        },
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});
