import { writable } from 'svelte/store';

export type Role = 'ADMIN' | 'BORROWER';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export const user = writable<User | null>(null);
