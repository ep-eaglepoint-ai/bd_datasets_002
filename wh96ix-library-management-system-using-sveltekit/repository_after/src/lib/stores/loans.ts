import { writable } from 'svelte/store';
import type { Book } from './books';

export interface Loan {
  id: number;
  book: Book;
  user?: { id: number; name: string; email: string };
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  isOverdue?: boolean;
  fineCents?: number;
}

export const loans = writable<Loan[]>([]);
export const loadingLoans = writable(false);
export const viewAllLoans = writable(false);
