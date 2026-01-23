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

describe('useProductSearch Debounce Behavior', () => {
  it('debounces search requests correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts('final'),
        total: 1,
        page: 1,
        hasMore: false,
      }),
    });

    const { result } = renderHook(() => useProductSearch());

    // Type quickly
    act(() => {
      result.current.search('l');
      jest.advanceTimersByTime(100);
      result.current.search('la');
      jest.advanceTimersByTime(100);
      result.current.search('lap');
      jest.advanceTimersByTime(100);
      result.current.search('lapt');
      jest.advanceTimersByTime(100);
      result.current.search('lapto');
      jest.advanceTimersByTime(100);
      result.current.search('laptop');
      jest.advanceTimersByTime(300); // Complete debounce
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(1);
    });

    expect(result.current.products[0].name).toBe('final product 1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=laptop'),
      expect.any(Object)
    );
  });

  it('cancels previous debounce timers on new search', () => {
    const { result } = renderHook(() => useProductSearch());

    act(() => {
      result.current.search('first');
      jest.advanceTimersByTime(200); // Almost debounce
      result.current.search('second');
      jest.advanceTimersByTime(200); // Still debouncing
    });

    // Only one timer should be active
    expect(jest.getTimerCount()).toBe(1);
  });

  it('respects exact debounce delay', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        products: mockProducts('test'),
        total: 1,
        page: 1,
        hasMore: false,
      }),
    });

    const { result } = renderHook(() => useProductSearch());

    act(() => {
      result.current.search('test');
      jest.advanceTimersByTime(299); // Just before debounce
    });

    expect(mockFetch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1); // Complete debounce
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('clears debounce timer on empty query', () => {
    const { result } = renderHook(() => useProductSearch());

    act(() => {
      result.current.search('test');
      jest.advanceTimersByTime(150);
      result.current.search(''); // Empty query
    });

    expect(jest.getTimerCount()).toBe(0);
    expect(result.current.products).toHaveLength(0);
  });
});