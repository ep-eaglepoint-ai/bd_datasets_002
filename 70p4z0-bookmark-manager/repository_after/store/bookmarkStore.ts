import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Bookmark, 
  BookmarkFormData, 
  BookmarkUpdateData,
  BookmarkTag,
  BookmarkCollection,
  TagFormData,
  TagUpdateData,
  TagRenameData,
  TagMergeData,
  CollectionFormData,
  CollectionUpdateData,
  CollectionRenameData,
  CreateTagResult,
  RenameTagResult,
  MergeTagsResult,
  DeleteTagResult,
  CreateCollectionResult,
  RenameCollectionResult,
  DeleteCollectionResult
} from '../types';
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
   Store interface (EXTENDED with collection management)
----------------------------------------------------- */
interface BookmarkStore {
  // State
  bookmarks: Bookmark[];
  tags: BookmarkTag[];
  collections: BookmarkCollection[];
  
  // Bookmark actions
  addBookmark: (data: unknown) => AddBookmarkResult;
  editBookmark: (data: unknown) => EditBookmarkResult;
  deleteBookmark: (id: string) => DeleteBookmarkResult;
  getBookmark: (id: string) => Bookmark | undefined;
  getAllBookmarks: () => Bookmark[];
  findDuplicateByUrl: (url: string) => Bookmark | undefined;
  searchBookmarks: (query: string) => Bookmark[];
  getBookmarksByTag: (tag: string) => Bookmark[];
  getBookmarksByCategory: (category: string) => Bookmark[];
  getBookmarksByCollection: (collectionId: string) => Bookmark[];
  getFavoriteBookmarks: () => Bookmark[];

  // Tag actions
  createTag: (data: unknown) => CreateTagResult;
  renameTag: (data: unknown) => RenameTagResult;
  mergeTags: (data: unknown) => MergeTagsResult;
  deleteTag: (id: string) => DeleteTagResult;
  getTag: (id: string) => BookmarkTag | undefined;
  getTagByNormalized: (normalized: string) => BookmarkTag | undefined;
  getAllTags: () => BookmarkTag[];
  getTagUsage: (tagId: string) => number;

  // Collection actions
  createCollection: (data: unknown) => CreateCollectionResult;
  renameCollection: (data: unknown) => RenameCollectionResult;
  deleteCollection: (id: string) => DeleteCollectionResult;
  getCollection: (id: string) => BookmarkCollection | undefined;
  getAllCollections: () => BookmarkCollection[];
  getCollectionUsage: (collectionId: string) => number;
  getRootCollections: () => BookmarkCollection[];
  getChildCollections: (parentId: string) => BookmarkCollection[];
}

/* -----------------------------------------------------
   Helpers (EXTENDED with tag helpers)
----------------------------------------------------- */
const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const normalizeTagName = (name: string): string => {
  return name.toLowerCase().trim();
};

const createTag = (data: TagFormData): BookmarkTag => {
  const now = new Date();
  return {
    ...data,
    id: generateId(),
    normalized: normalizeTagName(data.name),
    createdAt: now,
    updatedAt: now,
  };
};

const createCollection = (data: CollectionFormData): BookmarkCollection => {
  const now = new Date();
  return {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const createBookmark = (data: BookmarkFormData): Bookmark => {
  const now = new Date();
  return {
    ...data,
    id: generateId(),
    tags: data.tags.map(normalizeTagName),
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
  tags: updates.tags ? updates.tags.map(normalizeTagName) : existing.tags,
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

const isValidTagArray = (value: unknown): value is BookmarkTag[] => {
  if (!Array.isArray(value)) return false;

  return value.every((t) =>
    t &&
    typeof t === 'object' &&
    typeof (t as any).id === 'string' &&
    typeof (t as any).name === 'string' &&
    typeof (t as any).normalized === 'string'
  );
};

const isValidCollectionArray = (value: unknown): value is BookmarkCollection[] => {
  if (!Array.isArray(value)) return false;

  return value.every((c) =>
    c &&
    typeof c === 'object' &&
    typeof (c as any).id === 'string' &&
    typeof (c as any).name === 'string'
  );
};

/* -----------------------------------------------------
   Store with persistence (COMPLIANT)
----------------------------------------------------- */
export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      tags: [],
      collections: [],

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

      // Tag management methods
      createTag: (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return { success: false, error: ['Invalid tag data'] };
          }

          const tagData = data as any;
          if (!tagData.name || typeof tagData.name !== 'string') {
            return { success: false, error: ['Tag name is required'] };
          }

          const normalizedName = normalizeTagName(tagData.name);
          if (!normalizedName) {
            return { success: false, error: ['Tag name cannot be empty'] };
          }

          // Check for duplicates
          const existing = get().getTagByNormalized(normalizedName);
          if (existing) {
            return { success: false, error: ['Tag with this name already exists'] };
          }

          const tag = createTag({
            name: tagData.name,
            color: tagData.color,
          });

          set((state) => ({
            tags: [...state.tags, tag],
          }));

          return { success: true, tag };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      renameTag: (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return { success: false, error: ['Invalid rename data'] };
          }

          const renameData = data as any;
          if (!renameData.id || !renameData.newName) {
            return { success: false, error: ['Tag ID and new name are required'] };
          }

          const existing = get().getTag(renameData.id);
          if (!existing) {
            return { success: false, error: 'not_found' };
          }

          const normalizedName = normalizeTagName(renameData.newName);
          if (!normalizedName) {
            return { success: false, error: ['Tag name cannot be empty'] };
          }

          // Check for duplicates (excluding current tag)
          const duplicate = get().getTagByNormalized(normalizedName);
          if (duplicate && duplicate.id !== renameData.id) {
            return { success: false, error: 'duplicate' };
          }

          const updatedTag = {
            ...existing,
            name: renameData.newName,
            normalized: normalizedName,
            updatedAt: new Date(),
          };

          set((state) => ({
            tags: state.tags.map((t) => (t.id === renameData.id ? updatedTag : t)),
            bookmarks: state.bookmarks.map((bookmark) => ({
              ...bookmark,
              tags: bookmark.tags.map((tag) =>
                tag === existing.normalized ? normalizedName : tag
              ),
            })),
          }));

          return { success: true, tag: updatedTag };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      mergeTags: (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return { success: false, error: ['Invalid merge data'] };
          }

          const mergeData = data as any;
          if (!mergeData.sourceId || !mergeData.targetId) {
            return { success: false, error: ['Source and target tag IDs are required'] };
          }

          if (mergeData.sourceId === mergeData.targetId) {
            return { success: false, error: 'same_tag' };
          }

          const sourceTag = get().getTag(mergeData.sourceId);
          const targetTag = get().getTag(mergeData.targetId);

          if (!sourceTag || !targetTag) {
            return { success: false, error: 'not_found' };
          }

          // Update all bookmarks to use target tag instead of source tag
          set((state) => ({
            tags: state.tags.filter((t) => t.id !== mergeData.sourceId),
            bookmarks: state.bookmarks.map((bookmark) => ({
              ...bookmark,
              tags: bookmark.tags.map((tag) =>
                tag === sourceTag.normalized ? targetTag.normalized : tag
              ),
            })),
          }));

          return { success: true, mergedTag: targetTag, deletedTag: sourceTag };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      deleteTag: (id) => {
        try {
          const tag = get().getTag(id);
          if (!tag) {
            return { success: false, error: 'not_found' };
          }

          // Check if tag is in use
          const usage = get().getTagUsage(id);
          if (usage > 0) {
            return { success: false, error: 'in_use' };
          }

          set((state) => ({
            tags: state.tags.filter((t) => t.id !== id),
          }));

          return { success: true, deletedId: id };
        } catch {
          return { success: false, error: 'not_found' };
        }
      },

      getTag: (id) => get().tags.find((t) => t.id === id),

      getTagByNormalized: (normalized) =>
        get().tags.find((t) => t.normalized === normalized),

      getAllTags: () => [...get().tags],

      getTagUsage: (tagId) => {
        const tag = get().getTag(tagId);
        if (!tag) return 0;
        
        return get().bookmarks.filter((bookmark) =>
          bookmark.tags.includes(tag.normalized)
        ).length;
      },

      // Collection management methods
      createCollection: (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return { success: false, error: ['Invalid collection data'] };
          }

          const collectionData = data as any;
          if (!collectionData.name || typeof collectionData.name !== 'string') {
            return { success: false, error: ['Collection name is required'] };
          }

          // Check for duplicates (case-insensitive)
          const existing = get().collections.find(
            (c) => c.name.toLowerCase().trim() === collectionData.name.toLowerCase().trim()
          );
          if (existing) {
            return { success: false, error: ['Collection with this name already exists'] };
          }

          // Validate parent if specified
          if (collectionData.parentId) {
            const parent = get().getCollection(collectionData.parentId);
            if (!parent) {
              return { success: false, error: ['Parent collection not found'] };
            }
          }

          const collection = createCollection({
            name: collectionData.name,
            description: collectionData.description,
            color: collectionData.color,
            parentId: collectionData.parentId,
          });

          set((state) => ({
            collections: [...state.collections, collection],
          }));

          return { success: true, collection };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      renameCollection: (data) => {
        try {
          if (!data || typeof data !== 'object') {
            return { success: false, error: ['Invalid rename data'] };
          }

          const renameData = data as any;
          if (!renameData.id || !renameData.newName) {
            return { success: false, error: ['Collection ID and new name are required'] };
          }

          const existing = get().getCollection(renameData.id);
          if (!existing) {
            return { success: false, error: 'not_found' };
          }

          // Check for duplicates (excluding current collection)
          const duplicate = get().collections.find(
            (c) => c.id !== renameData.id && 
                   c.name.toLowerCase().trim() === renameData.newName.toLowerCase().trim()
          );
          if (duplicate) {
            return { success: false, error: 'duplicate' };
          }

          const updatedCollection = {
            ...existing,
            name: renameData.newName,
            updatedAt: new Date(),
          };

          set((state) => ({
            collections: state.collections.map((c) => 
              c.id === renameData.id ? updatedCollection : c
            ),
          }));

          return { success: true, collection: updatedCollection };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      deleteCollection: (id) => {
        try {
          const collection = get().getCollection(id);
          if (!collection) {
            return { success: false, error: 'not_found' };
          }

          // Check for child collections
          const hasChildren = get().collections.some((c) => c.parentId === id);
          if (hasChildren) {
            return { success: false, error: 'has_children' };
          }

          // Move bookmarks to uncategorized (remove collectionId)
          let movedCount = 0;
          set((state) => {
            const affectedBookmarks = state.bookmarks.filter((b) => b.collectionId === id);
            movedCount = affectedBookmarks.length;
            
            return {
              collections: state.collections.filter((c) => c.id !== id),
              bookmarks: state.bookmarks.map((bookmark) =>
                bookmark.collectionId === id 
                  ? { ...bookmark, collectionId: undefined, updatedAt: new Date() }
                  : bookmark
              ),
            };
          });

          return { success: true, deletedId: id, movedBookmarks: movedCount };
        } catch {
          return { success: false, error: ['Unexpected error occurred'] };
        }
      },

      getCollection: (id) => get().collections.find((c) => c.id === id),

      getAllCollections: () => [...get().collections],

      getCollectionUsage: (collectionId) => {
        return get().bookmarks.filter((bookmark) => 
          bookmark.collectionId === collectionId
        ).length;
      },

      getRootCollections: () => 
        get().collections.filter((c) => !c.parentId),

      getChildCollections: (parentId) =>
        get().collections.filter((c) => c.parentId === parentId),

      getBookmarksByCollection: (collectionId) =>
        get().bookmarks.filter((b) => b.collectionId === collectionId),
    }),
    {
      name: 'bookmark-storage',
      storage: createJSONStorage(() => localStorage),

      /* Persist ONLY state, not behavior */
      partialize: (state) => ({ 
        bookmarks: state.bookmarks, 
        tags: state.tags, 
        collections: state.collections 
      }),

      /* Safe restore: drop malformed data */
      onRehydrateStorage: () => (state) => {
        if (!state || !isValidBookmarkArray(state.bookmarks)) {
          state!.bookmarks = [];
        }
        if (!state || !isValidTagArray(state.tags)) {
          state!.tags = [];
        }
        if (!state || !isValidCollectionArray(state.collections)) {
          state!.collections = [];
        }
      },
    }
  )
);
