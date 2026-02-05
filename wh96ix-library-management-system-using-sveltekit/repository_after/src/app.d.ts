// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { PrismaClient } from '@prisma/client';

declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        email: string;
        name: string;
        role: 'ADMIN' | 'BORROWER';
      } | null;
      prisma: PrismaClient;
    }
    // interface PageData {}
  }
}

export {};
