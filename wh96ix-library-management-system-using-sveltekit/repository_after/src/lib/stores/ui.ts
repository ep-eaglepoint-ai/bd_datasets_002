import { writable } from 'svelte/store';

export const authError = writable('');
export const authLoading = writable(false);
export const actionLoading = writable<Record<string, boolean>>({});
export const selectedCategory = writable<string>('all');
export const currentPage = writable<{ books: number; loans: number }>({ books: 1, loans: 1 });
export const itemsPerPage = writable<{ books: number; loans: number }>({ books: 10, loans: 10 });
