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
  SearchOptions,
  SortOptions,
  BookmarkFilter,
  FilterAndSortOptions,
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
  searchBookmarksAdvanced: (query: string, options?: SearchOptions) => Bookmark[];
  
  // Sorting and filtering methods
  sortBookmarks: (options: SortOptions) => Bookmark[];
  filterBookmarks: (filter: BookmarkFilter) => Bookmark[];
  getFilteredAndSortedBookmarks: (options: FilterAndSortOptions) => Bookmark[];
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

      // Advanced search functionality
      searchBookmarksAdvanced: (query, options = {}) => {
        try {
          if (!query || typeof query !== 'string') {
            return [];
          }

          const {
            fields = ['title', 'url', 'description', 'tags'],
            caseSensitive = false,
            exactMatch = false,
            includeFavorites = false,
            collectionId = undefined,
            tagNames = undefined,
          } = options;

          const bookmarks = get().bookmarks;
          const tags = get().tags;
          
          // Create tag lookup for efficient tag name matching
          const tagMap = new Map();
          tags.forEach(tag => {
            tagMap.set(tag.normalized, tag.name);
          });

          // Pre-filter by collection if specified
          let filteredBookmarks = collectionId 
            ? bookmarks.filter(b => b.collectionId === collectionId)
            : bookmarks;

          // Pre-filter by favorites if specified
          if (includeFavorites) {
            filteredBookmarks = filteredBookmarks.filter(b => b.isFavorite);
          }

          // Pre-filter by tags if specified
          if (tagNames && tagNames.length > 0) {
            const normalizedTagNames = tagNames.map(name => 
              name.toLowerCase().trim()
            );
            filteredBookmarks = filteredBookmarks.filter(bookmark =>
              normalizedTagNames.some(tagName =>
                bookmark.tags.includes(tagName)
              )
            );
          }

          // Prepare search term
          const searchTerm = caseSensitive ? query : query.toLowerCase();
          
          // Search function for individual fields
          const matchesField = (bookmark, field) => {
            let value = '';
            
            switch (field) {
              case 'title':
                value = bookmark.title;
                break;
              case 'url':
                value = bookmark.url;
                break;
              case 'description':
                value = bookmark.description || '';
                break;
              case 'tags':
                // Search in tag names, not normalized values
                value = bookmark.tags
                  .map(tagNormalized => tagMap.get(tagNormalized) || tagNormalized)
                  .join(' ');
                break;
              default:
                return false;
            }

            if (!caseSensitive) {
              value = value.toLowerCase();
            }

            return exactMatch ? value === searchTerm : value.includes(searchTerm);
          };

          // Perform search
          const results = filteredBookmarks.filter(bookmark =>
            fields.some(field => matchesField(bookmark, field))
          );

          // Sort by relevance (title matches first, then description, then url, then tags)
          return results.sort((a, b) => {
            const aTitle = caseSensitive ? a.title : a.title.toLowerCase();
            const bTitle = caseSensitive ? b.title : b.title.toLowerCase();
            
            const aExactTitle = aTitle === searchTerm;
            const bExactTitle = bTitle === searchTerm;
            
            if (aExactTitle && !bExactTitle) return -1;
            if (!aExactTitle && bExactTitle) return 1;
            
            // Then by title contains
            const aTitleContains = aTitle.includes(searchTerm);
            const bTitleContains = bTitle.includes(searchTerm);
            
            if (aTitleContains && !bTitleContains) return -1;
            if (!aTitleContains && bTitleContains) return 1;
            
            // Then by update date (most recent first)
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });

        } catch {
          return [];
        }
      },

      // Sorting functionality
      sortBookmarks: (options) => {
        try {
          const { field, direction = 'asc' } = options;
          const bookmarks = [...get().bookmarks];

          return bookmarks.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (field) {
              case 'dateAdded':
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
                break;
              case 'lastVisited':
                aValue = a.lastVisited ? new Date(a.lastVisited).getTime() : 0;
                bValue = b.lastVisited ? new Date(b.lastVisited).getTime() : 0;
                break;
              case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
              case 'domain':
                aValue = new URL(a.url).hostname.toLowerCase();
                bValue = new URL(b.url).hostname.toLowerCase();
                break;
              case 'favorite':
                aValue = a.isFavorite ? 1 : 0;
                bValue = b.isFavorite ? 1 : 0;
                break;
              default:
                return 0;
            }

            if (aValue < bValue) {
              return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
              return direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        } catch {
          return [...get().bookmarks];
        }
      },

      // Filtering functionality
      filterBookmarks: (filter) => {
        try {
          const bookmarks = get().bookmarks;
          
          return bookmarks.filter(bookmark => {
            // Tags filter (AND logic - bookmark must have ALL specified tags)
            if (filter.tags && filter.tags.length > 0) {
              const normalizedFilterTags = filter.tags.map(tag => tag.toLowerCase().trim());
              const hasAllTags = normalizedFilterTags.every(filterTag =>
                bookmark.tags.includes(filterTag)
              );
              if (!hasAllTags) return false;
            }

            // Favorites filter
            if (filter.favorites !== undefined) {
              if (filter.favorites !== bookmark.isFavorite) return false;
            }

            // Date added filter
            if (filter.dateAdded) {
              const bookmarkTime = new Date(bookmark.createdAt).getTime();
              if (filter.dateAdded.from && bookmarkTime < new Date(filter.dateAdded.from).getTime()) {
                return false;
              }
              if (filter.dateAdded.to && bookmarkTime > new Date(filter.dateAdded.to).getTime()) {
                return false;
              }
            }

            // Last visited filter
            if (filter.lastVisited) {
              if (!bookmark.lastVisited) return false;
              const visitedTime = new Date(bookmark.lastVisited).getTime();
              if (filter.lastVisited.from && visitedTime < new Date(filter.lastVisited.from).getTime()) {
                return false;
              }
              if (filter.lastVisited.to && visitedTime > new Date(filter.lastVisited.to).getTime()) {
                return false;
              }
            }

            // Collection filter
            if (filter.collectionId !== undefined) {
              if (bookmark.collectionId !== filter.collectionId) return false;
            }

            // Domain filter
            if (filter.domain) {
              try {
                const bookmarkDomain = new URL(bookmark.url).hostname.toLowerCase();
                const filterDomain = filter.domain.toLowerCase();
                if (bookmarkDomain !== filterDomain) return false;
              } catch {
                return false;
              }
            }

            return true;
          });
        } catch {
          return [];
        }
      },

      // Combined filtering and sorting
      getFilteredAndSortedBookmarks: (options) => {
        try {
          let result = get().bookmarks;

          // Apply filters first
          if (options.filter) {
            result = get().filterBookmarks(options.filter);
          }

          // Apply sorting
          if (options.sort) {
            const { field, direction = 'asc' } = options.sort;
            result = result.sort((a, b) => {
              let aValue: any;
              let bValue: any;

              switch (field) {
                case 'dateAdded':
                  aValue = new Date(a.createdAt).getTime();
                  bValue = new Date(b.createdAt).getTime();
                  break;
                case 'lastVisited':
                  aValue = a.lastVisited ? new Date(a.lastVisited).getTime() : 0;
                  bValue = b.lastVisited ? new Date(b.lastVisited).getTime() : 0;
                  break;
                case 'title':
                  aValue = a.title.toLowerCase();
                  bValue = b.title.toLowerCase();
                  break;
                case 'domain':
                  aValue = new URL(a.url).hostname.toLowerCase();
                  bValue = new URL(b.url).hostname.toLowerCase();
                  break;
                case 'favorite':
                  aValue = a.isFavorite ? 1 : 0;
                  bValue = b.isFavorite ? 1 : 0;
                  break;
                default:
                  return 0;
              }

              if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
              }
              if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
              }
              return 0;
            });
          }

          // Apply pagination
          if (options.offset !== undefined) {
            result = result.slice(options.offset);
          }
          if (options.limit !== undefined) {
            result = result.slice(0, options.limit);
          }

          return result;
        } catch {
          return [];
        }
      },
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
