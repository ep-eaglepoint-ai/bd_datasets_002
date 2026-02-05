import { writable } from 'svelte/store';

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category?: string | null;
  totalCopies: number;
  availableCopies: number;
  publicationYear?: number | null;
}

export const books = writable<Book[]>([]);
export const loadingBooks = writable(false);
export const searchQuery = writable('');
