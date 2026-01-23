/**
 * Refactored useProductSearch hook to eliminate race conditions, memory leaks, and stale closures.
 *
 * Key improvements:
 * - Uses AbortController for request cancellation to prevent race conditions.
 * - Employs useRef for mounted state and fetching flags to avoid setState on unmounted components.
 * - Implements proper cleanup in useEffect to clear timers and abort requests.
 * - Uses functional state updates in nextPage to avoid stale closures.
 * - Deduplicates requests using isFetchingRef to prevent duplicate API calls.
 * - Correct dependency arrays in all hooks to satisfy exhaustive-deps ESLint rule.
 * - Compatible with React StrictMode and maintains exact API interface.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Product, SearchResponse } from './types';
import { searchProducts } from './api';

interface UseProductSearchResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  search: (query: string) => void;
  nextPage: () => void;
  refresh: () => void;
}

export const useProductSearch = (initialQuery: string = ''): UseProductSearchResult => {
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Refs for cleanup and race condition prevention
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const loadingRef = useRef(false);
  const activeRequestsRef = useRef<Set<string>>(new Set());
  const currentQueryRef = useRef<string>(initialQuery);
  const lastRequestIdRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    // Mark mounted on mount (handles StrictMode double-invoke)
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const fetchProducts = useCallback(async (searchQuery: string, pageNum: number) => {
    const key = `${searchQuery}|${pageNum}`;

    // Dedupe identical in-flight requests
    if (activeRequestsRef.current.has(key)) {
      return;
    }

    // Abort previous request (we want latest to win)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    activeRequestsRef.current.add(key);
    isFetchingRef.current = true;
    lastRequestIdRef.current += 1;
    const requestId = lastRequestIdRef.current;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await searchProducts(
        {
          query: searchQuery,
          page: pageNum,
          limit: 20,
        },
        controller.signal
      );

      // Only apply results if component still mounted and this is the latest request
      if (!isMountedRef.current || requestId !== lastRequestIdRef.current) {
        return;
      }

      setProducts(response.products);
      setHasMore(response.hasMore);
      setLoading(false);
      loadingRef.current = false;
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError(err instanceof Error ? err.message : 'Search failed');
      setLoading(false);
      loadingRef.current = false;
    } finally {
      activeRequestsRef.current.delete(key);
      // only clear controller if it is ours
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    // keep ref of current query for callbacks
    currentQueryRef.current = query;

    if (!query) {
      setProducts([]);
      setHasMore(false);
      setPage(1);
      setError(null);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchProducts(query, 1);
      setPage(1);
    }, 300);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchProducts]);

  const search = useCallback((newQuery: string) => {
    // update ref synchronously so pagination/use of current query isn't stale
    currentQueryRef.current = newQuery;
    setQuery(newQuery);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    if (!loadingRef.current && !isFetchingRef.current) {
      setPage((prev: number) => {
        const next = prev + 1;
        fetchProducts(currentQueryRef.current, next);
        return next;
      });
    }
  }, [fetchProducts]);

  const refresh = useCallback(() => {
    if (!isFetchingRef.current) {
      fetchProducts(currentQueryRef.current, page);
    }
  }, [page, fetchProducts]);

  return {
    products,
    loading,
    error,
    hasMore,
    page,
    search,
    nextPage,
    refresh,
  };
};