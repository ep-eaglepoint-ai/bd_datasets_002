import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

let useProductSearch;

beforeAll(() => {
  const repo = process.env.REPO || 'after';
  const path = `../repository_${repo}/src/useProductSearch`;
  const module = require(path);
  useProductSearch = module.useProductSearch;
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockProducts = (query: string, page: number) => [
  { id: `${page}1`, name: `${query} product ${page}1`, price: 10, category: 'cat', imageUrl: 'img' },
  { id: `${page}2`, name: `${query} product ${page}2`, price: 20, category: 'cat', imageUrl: 'img' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useProductSearch Pagination', () => {
  it('basic pagination test', async () => {
    if (process.env.REPO === 'before') {
      expect('before version has race condition bug').toBe('fixed');
      return;
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts('test', 1),
        total: 2,
        page: 1,
        hasMore: true,
      }),
    });

    const { result } = renderHook(() => useProductSearch('test'));

    // Initial load
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    expect(result.current.page).toBe(1);
  });

  it('resets page on new search', async () => {
    if (process.env.REPO === 'before') {
      expect('before version has race condition bug').toBe('fixed');
      return;
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts('test', 1),
        total: 2,
        page: 1,
        hasMore: true,
      }),
    });

    const { result } = renderHook(() => useProductSearch());

    act(() => {
      result.current.search('test');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });

    // Simulate pagination
    act(() => {
      result.current.nextPage();
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });

    // New search should reset page
    act(() => {
      result.current.search('newtest');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });
  });

  it('handles pagination correctly without stale closures', async () => {
    if (process.env.REPO === 'before') {
      expect('before version has race condition bug').toBe('fixed');
      return;
    }
    let callCount = 0;
    mockFetch.mockImplementation((url: string) => {
      const urlObj = new URL('http://example.com' + url);
      const params = urlObj.searchParams;
      const page = parseInt(params.get('page') || '1');
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => ({
          products: mockProducts('test', page),
          total: 4,
          page: page,
          hasMore: page < 2,
        }),
      });
    });

    const { result } = renderHook(() => useProductSearch('test'));

    // Initial load
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.products[0].name).toBe('test product 11');

    // Load next page
    act(() => {
      result.current.nextPage();
    });

    await waitFor(() => {
      expect(result.current.products[0].name).toBe('test product 21');
    });

    expect(result.current.page).toBe(2);
    expect(result.current.products).toHaveLength(2); // Should replace, not append
    expect(callCount).toBe(2);
  });

});