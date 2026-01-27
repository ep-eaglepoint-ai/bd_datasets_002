import { useMemo, useCallback } from 'react';
import { SurveyResponse } from '@/lib/schemas/survey';
import { analyticsCache } from './streaming';

/**
 * Creates a memoized function that caches results based on dependencies
 */
export function useMemoizedAnalytics<T>(
  computeFn: () => T,
  dependencies: unknown[],
  cacheKey: string
): T {
  return useMemo(() => {
    // Check cache first
    const cached = analyticsCache.get<T>(cacheKey, dependencies.map(String));
    if (cached !== null) {
      return cached;
    }

    // Compute new value
    const result = computeFn();
    
    // Cache it
    analyticsCache.set(cacheKey, result, dependencies.map(String));
    
    return result;
  }, dependencies);
}

/**
 * Creates a stable callback that only changes when dependencies change
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  dependencies: unknown[]
): T {
  return useCallback(callback, dependencies) as T;
}

/**
 * Memoizes a computation function with automatic cache invalidation
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  getKey: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Creates a hash from dependencies for cache key
 */
export function hashDependencies(deps: unknown[]): string {
  return deps.map(dep => {
    if (dep === null || dep === undefined) return 'null';
    if (typeof dep === 'object') {
      try {
        return JSON.stringify(dep);
      } catch {
        return String(dep);
      }
    }
    return String(dep);
  }).join('|');
}
