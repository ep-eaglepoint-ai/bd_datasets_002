import { useState, useEffect, useCallback } from 'react';
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

  const fetchProducts = async (searchQuery: string, pageNum: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchProducts({
        query: searchQuery,
        page: pageNum,
        limit: 20,
      });

      setProducts(response.products);
      setHasMore(response.hasMore);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchProducts(query, page);
    }, 300);
  }, [query]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => {
    if (!loading && hasMore) {
      const nextPageNum = page + 1;
      setPage(nextPageNum);
      fetchProducts(query, nextPageNum);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    fetchProducts(query, page);
  }, [query, page]);

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

