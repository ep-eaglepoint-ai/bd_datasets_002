export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  category?: string;
}

export interface BookmarkCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkTag {
  id: string;
  name: string;
  color?: string;
  count: number;
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

export interface BookmarkStats {
  total: number;
  favorites: number;
  categories: number;
  tags: number;
  recent: number;
}
