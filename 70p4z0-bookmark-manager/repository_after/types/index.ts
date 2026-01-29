export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[]; // normalized tag names
  collectionId?: string; // Reference to collection
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  category?: string; // Keep for backward compatibility
}

export interface BookmarkCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: string; // Support nested collections
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkTag {
  id: string;
  name: string;
  normalized: string; // lowercase, trimmed
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkFilter {
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
  searchQuery?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface BookmarkSort {
  field: 'title' | 'createdAt' | 'updatedAt' | 'url';
  direction: 'asc' | 'desc';
}

export interface BookmarkPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BookmarkSearchResult {
  bookmarks: Bookmark[];
  pagination: BookmarkPagination;
  hasMore: boolean;
}

export type BookmarkFormData = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>;

export type BookmarkUpdateData = Partial<BookmarkFormData> & {
  id: string;
};

// Tag management types
export type TagFormData = {
  name: string;
  color?: string;
};

export type TagUpdateData = Partial<TagFormData> & {
  id: string;
};

export type TagRenameData = {
  id: string;
  newName: string;
};

export type TagMergeData = {
  sourceId: string;
  targetId: string;
};

// Tag operation result types
export type CreateTagResult =
  | { success: true; tag: BookmarkTag }
  | { success: false; error: string[] };

export type RenameTagResult =
  | { success: true; tag: BookmarkTag }
  | { success: false; error: string[] | 'not_found' | 'duplicate' };

export type MergeTagsResult =
  | { success: true; mergedTag: BookmarkTag; deletedTag: BookmarkTag }
  | { success: false; error: string[] | 'not_found' | 'same_tag' };

// Collection management types
export type CollectionFormData = Omit<BookmarkCollection, 'id' | 'createdAt' | 'updatedAt'>;

export type CollectionUpdateData = Partial<CollectionFormData> & {
  id: string;
};

export type CollectionRenameData = {
  id: string;
  newName: string;
};

// Collection operation result types
export type CreateCollectionResult =
  | { success: true; collection: BookmarkCollection }
  | { success: false; error: string[] };

export type RenameCollectionResult =
  | { success: true; collection: BookmarkCollection }
  | { success: false; error: string[] | 'not_found' | 'duplicate' };

export type DeleteCollectionResult =
  | { success: true; deletedId: string; movedBookmarks: number }
  | { success: false; error: string[] | 'not_found' | 'has_children' };

export type DeleteTagResult =
  | { success: true; deletedId: string }
  | { success: false; error: string[] | 'not_found' | 'in_use' };

export interface BookmarkStats {
  total: number;
  favorites: number;
  categories: number;
  tags: number;
  recent: number;
}
