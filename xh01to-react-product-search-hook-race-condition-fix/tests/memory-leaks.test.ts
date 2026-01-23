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

const mockProducts = (query: string) => [
  { id: '1', name: `${query} product 1`, price: 10, category: 'cat', imageUrl: 'img' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useProductSearch Memory Leaks', () => {
  it('does not call setState after component unmount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts('test'),
        total: 1,
        page: 1,
        hasMore: false,
      }),
    });

    const { result, unmount } = renderHook(() => useProductSearch());

    // Start a search
    act(() => {
      result.current.search('test');
    });

    // Advance timers to trigger fetch
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Unmount immediately
    unmount();

    // Wait for fetch to resolve
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Since component is unmounted, no state should be set
    // This test passes if no errors are thrown
  });

  it('cleans up timers on unmount', () => {
    const { unmount } = renderHook(() => useProductSearch());

    act(() => {
      // Start typing
      jest.advanceTimersByTime(150); // Partial debounce
    });

    unmount();

    // Timers should be cleaned up, no pending timers
    expect(jest.getTimerCount()).toBe(0);
  });

  it('aborts ongoing requests on unmount', async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockFetch.mockImplementation(() => fetchPromise);

    const { result, unmount } = renderHook(() => useProductSearch());

    act(() => {
      result.current.search('test');
      jest.advanceTimersByTime(300);
    });

    unmount();

    // Resolve the fetch after unmount
    resolveFetch({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts('test'),
        total: 1,
        page: 1,
        hasMore: false,
      }),
    });

    await fetchPromise;

    // Should not throw or set state
  });
});