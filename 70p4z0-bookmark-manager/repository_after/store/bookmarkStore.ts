import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Bookmark, BookmarkFormData, BookmarkUpdateData } from '../types';
import { validateCreateBookmark, validateUpdateBookmark } from '../validation/bookmark';
import { normalizeUrl } from '../utils/url';

/* -----------------------------------------------------
   Result types (UNCHANGED)
----------------------------------------------------- */
export type AddBookmarkResult =
  | { success: true; bookmark: Bookmark }
  | { success: false; error: string[] };

export type EditBookmarkResult =
  | { success: true; bookmark: Bookmark }
  | { success: false; error: string[] | 'not_found' };

export type DeleteBookmarkResult =
  | { success: true; deletedId: string }
  | { success: false; error: 'not_found' };

/* -----------------------------------------------------
   Store interface (UNCHANGED)
----------------------------------------------------- */
interface BookmarkStore {
  bookmarks: Bookmark[];

  addBookmark: (data: unknown) => AddBookmarkResult;
  editBookmark: (data: unknown) => EditBookmarkResult;
  deleteBookmark: (id: string) => DeleteBookmarkResult;

  getBookmark: (id: string) => Bookmark | undefined;
  getAllBookmarks: () => Bookmark[];
  findDuplicateByUrl: (url: string) => Bookmark | undefined;

  searchBookmarks: (query: string) => Bookmark[];
  getBookmarksByTag: (tag: string) => Bookmark[];
  getBookmarksByCategory: (category: string) => Bookmark[];
  getFavoriteBookmarks: () => Bookmark[];
}

/* -----------------------------------------------------
   Helpers (UNCHANGED behavior)
----------------------------------------------------- */
const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const createBookmark = (data: BookmarkFormData): Bookmark => {
  const now = new Date();
  return {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const updateBookmarkData = (
  existing: Bookmark,
  updates: Partial<BookmarkFormData>
): Bookmark => ({
  ...existing,
  ...updates,
  updatedAt: new Date(),
});

/* -----------------------------------------------------
   Minimal safety check for persisted data
   (DROP invalid data — do NOT fix it)
----------------------------------------------------- */
const isValidBookmarkArray = (value: unknown): value is Bookmark[] => {
  if (!Array.isArray(value)) return false;

  return value.every((b) =>
    b &&
    typeof b === 'object' &&
    typeof (b as any).id === 'string' &&
    typeof (b as any).title === 'string' &&
    typeof (b as any).url === 'string' &&
    Array.isArray((b as any).tags)
  );
};

/* -----------------------------------------------------
   Store with persistence (COMPLIANT)
----------------------------------------------------- */
export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (data) => {
        try {
          const validation = validateCreateBookmark(data);
          if (!validation.ok) {
            return { success: false, error: validation.error };
          }

          const normalizedUrl = normalizeUrl(validation.value.url);
          if (!normalizedUrl) {
            return { success: false, error: ['Invalid URL'] };
          }

          const duplicate = get().findDuplicateByUrl(normalizedUrl);
          if (duplicate) {
            return { success: false, error: ['Bookmark with this URL already exists'] };
          }

          const bookmark = createBookmark(validation.value);
          set((state) => ({ bookmarks: [...state.bookmarks, bookmark] }));

          return { success: true, bookmark };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      editBookmark: (data) => {
        try {
          const validation = validateUpdateBookmark(data);
          if (!validation.ok) {
            return { success: false, error: validation.error };
          }

          const { id, ...updates } = validation.value;
          const existing = get().getBookmark(id);
          if (!existing) {
            return { success: false, error: 'not_found' };
          }

          if (updates.url) {
            const normalizedUrl = normalizeUrl(updates.url);
            if (!normalizedUrl) {
              return { success: false, error: ['Invalid URL'] };
            }

            const duplicate = get().findDuplicateByUrl(normalizedUrl);
            if (duplicate && duplicate.id !== id) {
              return { success: false, error: ['Another bookmark with this URL already exists'] };
            }
          }

          const updated = updateBookmarkData(existing, updates);
          set((state) => ({
            bookmarks: state.bookmarks.map((b) => (b.id === id ? updated : b)),
          }));

          return { success: true, bookmark: updated };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      deleteBookmark: (id) => {
        try {
          const existing = get().getBookmark(id);
          if (!existing) {
            return { success: false, error: 'not_found' };
          }

          set((state) => ({
            bookmarks: state.bookmarks.filter((b) => b.id !== id),
          }));

          return { success: true, deletedId: id };
        } catch {
          return { success: false, error: 'not_found' };
        }
      },

      getBookmark: (id) => get().bookmarks.find((b) => b.id === id),

      getAllBookmarks: () => [...get().bookmarks],

      findDuplicateByUrl: (url) => {
        const normalized = normalizeUrl(url);
        if (!normalized) return undefined;

        return get().bookmarks.find(
          (b) => normalizeUrl(b.url) === normalized
        );
      },

      searchBookmarks: (query) => {
        if (!query.trim()) return [];

        const q = query.toLowerCase();
        return get().bookmarks.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.description?.toLowerCase().includes(q) ||
            b.tags.some((t) => t.toLowerCase().includes(q)) ||
            b.category?.toLowerCase().includes(q)
        );
      },

      getBookmarksByTag: (tag) =>
        get().bookmarks.filter((b) =>
          b.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        ),

      getBookmarksByCategory: (category) =>
        get().bookmarks.filter(
          (b) => b.category?.toLowerCase() === category.toLowerCase()
        ),

      getFavoriteBookmarks: () =>
        get().bookmarks.filter((b) => b.isFavorite),
    }),
    {
      name: 'bookmark-storage',
      storage: createJSONStorage(() => localStorage),

      /* Persist ONLY state, not behavior */
      partialize: (state) => ({ bookmarks: state.bookmarks }),

      /* Safe restore: drop malformed data */
      onRehydrateStorage: () => (state) => {
        if (!state || !isValidBookmarkArray(state.bookmarks)) {
          state!.bookmarks = [];
        }
      },
    }
  )
);
