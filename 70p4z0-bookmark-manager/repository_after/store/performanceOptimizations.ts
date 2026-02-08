import { Bookmark } from '../types';

// Simple memoization cache
interface MemoCache {
  get(key: string): any;
  set(key: string, value: any): void;
  clear(): void;
  size: number;
}

class SimpleMemoCache implements MemoCache {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private readonly maxAge = 5000; // 5 seconds

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: any): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global caches
const searchCache = new SimpleMemoCache();
const analyticsCache = new SimpleMemoCache();

// Simple debounce implementation
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Memoized search function
export const memoizedSearch = (
  bookmarks: Bookmark[],
  tags: any[],
  query: string,
  options: any = {}
): Bookmark[] => {
  const cacheKey = JSON.stringify({ query, options, bookmarkCount: bookmarks.length });
  
  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  // Perform search if not cached
  const results = performSearch(bookmarks, tags, query, options);
  
  // Cache the result
  searchCache.set(cacheKey, results);
  
  return results;
};

// Optimized search implementation
const performSearch = (
  bookmarks: Bookmark[],
  tags: any[],
  query: string,
  options: any
): Bookmark[] => {
  if (!query || typeof query !== 'string') return [];

  const {
    fields = ['title', 'url', 'description', 'tags'],
    caseSensitive = false,
    exactMatch = false,
    includeFavorites = false,
    collectionId = undefined,
    tagNames = undefined,
  } = options;

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
    const normalizedTagNames = tagNames.map((name: string) => name.toLowerCase().trim());
    filteredBookmarks = filteredBookmarks.filter(bookmark =>
      normalizedTagNames.some((tagName: string) => bookmark.tags.includes(tagName))
    );
  }

  // Optimized search
  const searchTerm = caseSensitive ? query : query.toLowerCase();
  
  const matchesField = (bookmark: Bookmark, field: string): boolean => {
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
};

// Memoized analytics functions
export const memoizedMostVisitedBookmarks = (bookmarks: Bookmark[], limit: number = 10): Bookmark[] => {
  const cacheKey = `mostVisited_${limit}_${bookmarks.length}`;
  
  const cached = analyticsCache.get(cacheKey);
  if (cached) return cached;

  const results = bookmarks
    .filter(bookmark => bookmark.clickCount > 0)
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, limit);

  analyticsCache.set(cacheKey, results);
  return results;
};

export const memoizedFrequentlySavedDomains = (bookmarks: Bookmark[], limit: number = 10): { domain: string; count: number }[] => {
  const cacheKey = `domains_${limit}_${bookmarks.length}`;
  
  const cached = analyticsCache.get(cacheKey);
  if (cached) return cached;

  const domainCounts = new Map<string, number>();

  bookmarks.forEach(bookmark => {
    try {
      const domain = new URL(bookmark.url).hostname.toLowerCase();
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } catch {
      // Skip invalid URLs
    }
  });

  const results = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  analyticsCache.set(cacheKey, results);
  return results;
};

export const memoizedTagDistribution = (bookmarks: Bookmark[]): { tag: string; count: number }[] => {
  const cacheKey = `tagDistribution_${bookmarks.length}`;
  
  const cached = analyticsCache.get(cacheKey);
  if (cached) return cached;

  const tagCounts = new Map<string, number>();

  bookmarks.forEach(bookmark => {
    bookmark.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  const results = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  analyticsCache.set(cacheKey, results);
  return results;
};

export const memoizedBookmarkingTrends = (bookmarks: Bookmark[], days: number = 30): { date: string; count: number }[] => {
  const cacheKey = `trends_${days}_${bookmarks.length}`;
  
  const cached = analyticsCache.get(cacheKey);
  if (cached) return cached;

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

  const results = Array.from(dailyCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  analyticsCache.set(cacheKey, results);
  return results;
};

export const memoizedFavoriteUsagePatterns = (bookmarks: Bookmark[]): { total: number; favorites: number; percentage: number } => {
  const cacheKey = `favoritePatterns_${bookmarks.length}`;
  
  const cached = analyticsCache.get(cacheKey);
  if (cached) return cached;

  const total = bookmarks.length;
  const favorites = bookmarks.filter(bookmark => bookmark.isFavorite).length;
  const percentage = total > 0 ? Math.round((favorites / total) * 100) : 0;

  const result = { total, favorites, percentage };
  analyticsCache.set(cacheKey, result);
  return result;
};

// Batch operation utilities
export interface BatchOperation {
  type: 'add' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export class BatchProcessor {
  private operations: BatchOperation[] = [];
  private isProcessing = false;

  addOperation(operation: BatchOperation): void {
    this.operations.push(operation);
  }

  startBatch(): void {
    this.isProcessing = true;
  }

  endBatch(): void {
    this.isProcessing = false;
  }

  flushBatch(currentBookmarks: Bookmark[]): Bookmark[] {
    if (this.operations.length === 0) return currentBookmarks;

    let updatedBookmarks = [...currentBookmarks];
    
    // Process operations in order
    this.operations.forEach(operation => {
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
    
    // Clear operations
    this.operations = [];
    
    return updatedBookmarks;
  }

  get isBatching(): boolean {
    return this.isProcessing;
  }

  get pendingOperations(): BatchOperation[] {
    return [...this.operations];
  }
}

// Deterministic ordering function
export const getBookmarkSortKey = (bookmark: Bookmark): string => {
  return `${bookmark.isFavorite ? '0' : '1'}_${bookmark.title.toLowerCase()}_${bookmark.id}`;
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string) {
    const startTime = performance.now();
    return {
      end: (): number => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (!this.metrics.has(operation)) {
          this.metrics.set(operation, []);
        }
        this.metrics.get(operation)!.push(duration);
        
        return duration;
      }
    };
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((durations, operation) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      result[operation] = { avg, min, max, count: durations.length };
    });
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

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
export const clearCaches = (): void => {
  searchCache.clear();
  analyticsCache.clear();
  urlCache.clear();
  tagCache.clear();
};

export const getCacheStats = () => {
  return {
    searchCache: searchCache.size,
    analyticsCache: analyticsCache.size,
    urlCache: urlCache.size,
    tagCache: tagCache.size,
  };
};

// Performance utilities for the store
export const createPerformanceUtils = () => {
  const monitor = new PerformanceMonitor();
  const batchProcessor = new BatchProcessor();
  
  return {
    monitor,
    batchProcessor,
    memoizedSearch,
    memoizedMostVisitedBookmarks,
    memoizedFrequentlySavedDomains,
    memoizedTagDistribution,
    memoizedBookmarkingTrends,
    memoizedFavoriteUsagePatterns,
    debounce,
    normalizeUrl,
    normalizeTag,
    getBookmarkSortKey,
    clearCaches,
    getCacheStats,
  };
};
