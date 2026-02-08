import { createSelector } from 'reselect';
import { debounce } from 'lodash-es';
import { Bookmark, BookmarkFormData } from '../types';

// Memoized base selectors
const selectBookmarks = (state: any) => state.bookmarks;
const selectTags = (state: any) => state.tags;
const selectSearchQuery = (state: any) => state.searchQuery;

// Memoized search selector with performance optimizations
export const selectSearchResults = createSelector(
  [selectBookmarks, selectTags, (_, query: string, options?: any) => ({ query, options })],
  (bookmarks, tags, { query, options }) => {
    if (!query || typeof query !== 'string') return [];

    const {
      fields = ['title', 'url', 'description', 'tags'],
      caseSensitive = false,
      exactMatch = false,
      includeFavorites = false,
      collectionId = undefined,
      tagNames = undefined,
    } = options || {};

    // Create tag lookup for efficient tag name matching
    const tagMap = new Map();
    tags.forEach(tag => {
      tagMap.set(tag.normalized, tag.name);
    });

    // Pre-filter for performance
    let filteredBookmarks = collectionId 
      ? bookmarks.filter(b => b.collectionId === collectionId)
      : bookmarks;

    if (includeFavorites) {
      filteredBookmarks = filteredBookmarks.filter(b => b.isFavorite);
    }

    if (tagNames && tagNames.length > 0) {
      const normalizedTagNames = tagNames.map(name => name.toLowerCase().trim());
      filteredBookmarks = filteredBookmarks.filter(bookmark =>
        normalizedTagNames.some(tagName => bookmark.tags.includes(tagName))
      );
    }

    // Optimized search
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    const matchesField = (bookmark: Bookmark, field: string) => {
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

    // Perform search with relevance sorting
    const results = filteredBookmarks.filter(bookmark =>
      fields.some(field => matchesField(bookmark, field))
    );

    // Sort by relevance
    return results.sort((a, b) => {
      const aTitle = caseSensitive ? a.title : a.title.toLowerCase();
      const bTitle = caseSensitive ? b.title : b.title.toLowerCase();
      
      const aExactTitle = aTitle === searchTerm;
      const bExactTitle = bTitle === searchTerm;
      
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      
      const aTitleContains = aTitle.includes(searchTerm);
      const bTitleContains = bTitle.includes(searchTerm);
      
      if (aTitleContains && !bTitleContains) return -1;
      if (!aTitleContains && bTitleContains) return 1;
      
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
);

// Memoized analytics selectors
export const selectMostVisitedBookmarks = createSelector(
  [selectBookmarks, (_, limit: number = 10) => limit],
  (bookmarks, limit) => {
    return bookmarks
      .filter(bookmark => bookmark.clickCount > 0)
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, limit);
  }
);

export const selectFrequentlySavedDomains = createSelector(
  [selectBookmarks, (_, limit: number = 10) => limit],
  (bookmarks, limit) => {
    const domainCounts = new Map<string, number>();

    bookmarks.forEach(bookmark => {
      try {
        const domain = new URL(bookmark.url).hostname.toLowerCase();
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      } catch {
        // Skip invalid URLs
      }
    });

    return Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
);

export const selectTagDistribution = createSelector(
  [selectBookmarks],
  (bookmarks) => {
    const tagCounts = new Map<string, number>();

    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }
);

export const selectBookmarkingTrends = createSelector(
  [selectBookmarks, (_, days: number = 30) => days],
  (bookmarks, days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const dailyCounts = new Map<string, number>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyCounts.set(dateStr, 0);
    }

    // Count bookmarks created each day
    bookmarks.forEach(bookmark => {
      const createdDate = new Date(bookmark.createdAt);
      if (createdDate >= startDate && createdDate <= endDate) {
        const dateStr = createdDate.toISOString().split('T')[0];
        dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
      }
    });

    return Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
);

export const selectFavoriteUsagePatterns = createSelector(
  [selectBookmarks],
  (bookmarks) => {
    const total = bookmarks.length;
    const favorites = bookmarks.filter(bookmark => bookmark.isFavorite).length;
    const percentage = total > 0 ? Math.round((favorites / total) * 100) : 0;

    return { total, favorites, percentage };
  }
);

// Performance utilities
export const createDebouncedSearch = (searchFunction: (query: string, options?: any) => void) => {
  return debounce(searchFunction, 300);
};

// Deterministic ordering function
export const getBookmarkSortKey = (bookmark: Bookmark): string => {
  return `${bookmark.isFavorite ? '0' : '1'}_${bookmark.title.toLowerCase()}_${bookmark.id}`;
};

// Batch operation utilities
export interface BatchOperation {
  type: 'add' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export const createBatchProcessor = (state: any, setState: any) => {
  return {
    addToBatch: (operation: BatchOperation) => {
      setState((currentState: any) => ({
        ...currentState,
        batchOperations: [...currentState.batchOperations, operation],
      }));
    },
    
    flushBatch: () => {
      const { batchOperations, bookmarks } = state;
      let updatedBookmarks = [...bookmarks];
      
      // Process operations in order
      batchOperations.forEach(operation => {
        switch (operation.type) {
          case 'add':
            updatedBookmarks.push(operation.data);
            break;
          case 'update':
            updatedBookmarks = updatedBookmarks.map(bookmark =>
              bookmark.id === operation.data.id ? operation.data.updates : bookmark
            );
            break;
          case 'delete':
            updatedBookmarks = updatedBookmarks.filter(bookmark =>
              bookmark.id !== operation.data.id
            );
            break;
        }
      });
      
      // Apply deterministic ordering
      updatedBookmarks.sort((a, b) => 
        getBookmarkSortKey(a).localeCompare(getBookmarkSortKey(b))
      );
      
      setState({
        bookmarks: updatedBookmarks,
        batchOperations: [],
        isBatching: false,
      });
    },
  };
};

// Performance monitoring
export const createPerformanceMonitor = () => {
  const metrics = new Map<string, number[]>();
  
  return {
    startTimer: (operation: string) => {
      const startTime = performance.now();
      return {
        end: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          if (!metrics.has(operation)) {
            metrics.set(operation, []);
          }
          metrics.get(operation)!.push(duration);
          
          return duration;
        }
      };
    },
    
    getMetrics: () => {
      const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
      
      metrics.forEach((durations, operation) => {
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        result[operation] = { avg, min, max, count: durations.length };
      });
      
      return result;
    },
    
    clearMetrics: () => {
      metrics.clear();
    }
  };
};

// Optimized URL normalization with caching
const urlCache = new Map<string, string>();
export const normalizeUrl = (url: string): string => {
  if (urlCache.has(url)) {
    return urlCache.get(url)!;
  }
  
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol) {
      const normalized = `https://${url}`;
      urlCache.set(url, normalized);
      return normalized;
    }
    urlCache.set(url, urlObj.href);
    return urlObj.href;
  } catch {
    try {
      const urlObj = new URL(`https://${url}`);
      urlCache.set(url, urlObj.href);
      return urlObj.href;
    } catch {
      urlCache.set(url, url);
      return url;
    }
  }
};

// Optimized tag normalization with caching
const tagCache = new Map<string, string>();
export const normalizeTag = (tag: string): string => {
  if (tagCache.has(tag)) {
    return tagCache.get(tag)!;
  }
  
  const normalized = tag.toLowerCase().trim().replace(/\s+/g, ' ');
  tagCache.set(tag, normalized);
  return normalized;
};

// Memory management utilities
export const clearCaches = () => {
  urlCache.clear();
  tagCache.clear();
};

// Cache size monitoring
export const getCacheStats = () => {
  return {
    urlCache: urlCache.size,
    tagCache: tagCache.size,
  };
};
