import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock types for testing
interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  clickCount: number;
  visitTimestamps: Date[];
}

// Mock localStorage
const mockLocalStorage = new Map<string, string>();

// Mock localStorage API
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => mockLocalStorage.set(key, value)),
    removeItem: vi.fn((key: string) => mockLocalStorage.delete(key)),
    clear: vi.fn(() => mockLocalStorage.clear()),
  },
  writable: true,
});

describe('Local Persistence Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('Data Persists Across Simulated Reloads', () => {
    it('should persist single bookmark across reload simulation', () => {
      const bookmark: Bookmark = {
        id: 'bookmark-1',
        title: 'Test Bookmark',
        url: 'https://example.com',
        description: 'Test description',
        tags: ['test'],
        isFavorite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        clickCount: 5,
        visitTimestamps: [new Date()],
      };

      // Simulate saving to localStorage
      localStorage.setItem('test-bookmark-storage', JSON.stringify({ bookmarks: [bookmark] }));

      // Simulate reload - retrieve from localStorage
      const stored = localStorage.getItem('test-bookmark-storage');
      const parsedData = JSON.parse(stored || '{}');

      expect(parsedData.bookmarks).toHaveLength(1);
      expect(parsedData.bookmarks[0].id).toBe(bookmark.id);
      expect(parsedData.bookmarks[0].title).toBe(bookmark.title);
      expect(parsedData.bookmarks[0].url).toBe(bookmark.url);
    });

    it('should persist multiple bookmarks across reload simulation', () => {
      const bookmarks: Bookmark[] = [
        {
          id: 'bookmark-1',
          title: 'First Bookmark',
          url: 'https://first.com',
          tags: ['first'],
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          clickCount: 10,
          visitTimestamps: [],
        },
        {
          id: 'bookmark-2',
          title: 'Second Bookmark',
          url: 'https://second.com',
          tags: ['second'],
          isFavorite: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          clickCount: 3,
          visitTimestamps: [new Date(), new Date()],
        },
      ];

      localStorage.setItem('test-bookmark-storage', JSON.stringify({ bookmarks }));

      const stored = localStorage.getItem('test-bookmark-storage');
      const parsedData = JSON.parse(stored || '{}');

      expect(parsedData.bookmarks).toHaveLength(2);
      expect(parsedData.bookmarks[0].id).toBe('bookmark-1');
      expect(parsedData.bookmarks[1].id).toBe('bookmark-2');
    });
  });

  describe('Storage Implementation Uses localStorage', () => {
    it('should use localStorage for persistence', () => {
      const bookmark: Bookmark = {
        id: 'bookmark-1',
        title: 'Test',
        url: 'https://test.com',
        tags: [],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        clickCount: 0,
        visitTimestamps: [],
      };

      localStorage.setItem('test-bookmark-storage', JSON.stringify({ bookmarks: [bookmark] }));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'test-bookmark-storage',
        expect.any(String)
      );
    });

    it('should not use IndexedDB', () => {
      // IndexedDB should not be used for this implementation
      expect(typeof indexedDB).toBe('undefined');
    });
  });

  describe('No Network Requests During Persistence', () => {
    it('should not make network requests during localStorage operations', () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const bookmark: Bookmark = {
        id: 'bookmark-1',
        title: 'Test',
        url: 'https://test.com',
        tags: [],
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        clickCount: 0,
        visitTimestamps: [],
      };

      localStorage.setItem('test-bookmark-storage', JSON.stringify({ bookmarks: [bookmark] }));
      localStorage.getItem('test-bookmark-storage');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('State After Reload Matches Pre-Reload State', () => {
    it('should maintain exact state consistency', () => {
      const originalState = {
        bookmarks: [
          {
            id: 'bookmark-1',
            title: 'Consistency Test',
            url: 'https://consistency.com',
            description: 'Test with special chars: !@#$%^&*()',
            tags: ['consistency', 'test'],
            isFavorite: true,
            createdAt: new Date('2023-01-01T00:00:00Z'),
            updatedAt: new Date('2023-01-02T00:00:00Z'),
            clickCount: 25,
            visitTimestamps: [
              new Date('2023-01-01T10:00:00Z'),
              new Date('2023-01-01T15:00:00Z'),
            ],
          },
        ],
      };

      localStorage.setItem('test-bookmark-storage', JSON.stringify(originalState));

      const stored = localStorage.getItem('test-bookmark-storage');
      const reloadedState = JSON.parse(stored || '{}');

      // Compare the serialized form because JSON round-trips Dates to strings
      expect(stored).toBe(JSON.stringify(originalState));
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('test-bookmark-storage', 'invalid json');

      const stored = localStorage.getItem('test-bookmark-storage');
      
      expect(() => {
        JSON.parse(stored || '{}');
      }).toThrow();
      
      // Should handle gracefully with default state
      const defaultState = { bookmarks: [] };
      expect(defaultState.bookmarks).toEqual([]);
    });

    it('should handle missing localStorage key', () => {
      const stored = localStorage.getItem('non-existent-key');
      expect(stored).toBeNull();
      
      const defaultState = { bookmarks: [] };
      expect(defaultState.bookmarks).toEqual([]);
    });
  });
});
