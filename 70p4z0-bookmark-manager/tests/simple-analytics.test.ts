import { describe, it, expect } from 'vitest';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  isFavorite: boolean;
  clickCount: number;
  visitTimestamps: Date[];
}

// Simple analytics functions
function getMostVisitedBookmarks(bookmarks: Bookmark[], limit: number = 5): Bookmark[] {
  return bookmarks
    .filter(b => b.clickCount > 0)
    // Sort by clickCount desc, then by title asc for deterministic ties
    .sort((a, b) => b.clickCount - a.clickCount || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function getFrequentlySavedDomains(bookmarks: Bookmark[], limit: number = 5): Array<{domain: string, count: number}> {
  const domainCounts = new Map<string, number>();
  
  bookmarks.forEach(bookmark => {
    try {
      const url = new URL(bookmark.url);
      const domain = url.hostname;
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

function getTagDistribution(bookmarks: Bookmark[]): Array<{tag: string, count: number}> {
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

function getFavoriteUsagePatterns(bookmarks: Bookmark[]): {total: number, favorites: number, percentage: number} {
  const total = bookmarks.length;
  const favorites = bookmarks.filter(b => b.isFavorite).length;
  const percentage = total > 0 ? Math.round((favorites / total) * 100) : 0;
  
  return { total, favorites, percentage };
}

describe('Analytics Tests', () => {
  const testBookmarks: Bookmark[] = [
    {
      id: '1',
      title: 'Most Visited',
      url: 'https://popular.com',
      tags: ['popular', 'work'],
      isFavorite: true,
      clickCount: 50,
      visitTimestamps: [new Date()],
    },
    {
      id: '2',
      title: 'Medium Visited',
      url: 'https://medium.com',
      tags: ['medium', 'personal'],
      isFavorite: false,
      clickCount: 25,
      visitTimestamps: [new Date()],
    },
    {
      id: '3',
      title: 'Least Visited',
      url: 'https://rare.com',
      tags: ['rare'],
      isFavorite: true,
      clickCount: 5,
      visitTimestamps: [new Date()],
    },
    {
      id: '4',
      title: 'Never Visited',
      url: 'https://never.com',
      tags: [],
      isFavorite: false,
      clickCount: 0,
      visitTimestamps: [],
    },
    {
      id: '5',
      title: 'Another Popular',
      url: 'https://popular.com/different',
      tags: ['popular'],
      isFavorite: false,
      clickCount: 30,
      visitTimestamps: [new Date()],
    },
  ];

  describe('Visit History Tracking', () => {
    it('should track visit history accurately', () => {
      const mostVisited = getMostVisitedBookmarks(testBookmarks, 3);
      
      expect(mostVisited).toHaveLength(3);
      expect(mostVisited[0].clickCount).toBe(50);
      expect(mostVisited[1].clickCount).toBe(30);
      expect(mostVisited[2].clickCount).toBe(25);
      
      // Should exclude bookmarks with 0 visits
      const neverVisited = mostVisited.find(b => b.clickCount === 0);
      expect(neverVisited).toBeUndefined();
    });
  });

  describe('Analytics Metrics Accuracy', () => {
    it('should calculate frequently saved domains correctly', () => {
      const domains = getFrequentlySavedDomains(testBookmarks, 5);
      
      // There are four unique domains in the test data
      expect(domains).toHaveLength(4);
      expect(domains[0]).toEqual({ domain: 'popular.com', count: 2 });
      expect(domains[1]).toEqual({ domain: 'medium.com', count: 1 });
    });

    it('should calculate tag distribution accurately', () => {
      const tagDistribution = getTagDistribution(testBookmarks);
      
      expect(tagDistribution.length).toBeGreaterThan(0);
      expect(tagDistribution[0].tag).toBe('popular');
      expect(tagDistribution[0].count).toBe(2);
    });

    it('should calculate favorite usage patterns correctly', () => {
      const patterns = getFavoriteUsagePatterns(testBookmarks);
      
      expect(patterns.total).toBe(5);
      expect(patterns.favorites).toBe(2);
      expect(patterns.percentage).toBe(40);
    });
  });

  describe('State Determinism', () => {
    it('should maintain consistent ordering in analytics results', () => {
      const mostVisited1 = getMostVisitedBookmarks(testBookmarks, 5);
      const mostVisited2 = getMostVisitedBookmarks(testBookmarks, 5);
      
      expect(mostVisited1).toEqual(mostVisited2);
      
      // For equal click counts, should be deterministic (alphabetical by title)
      const tiesBookmarks = [
        {
          id: '1',
          title: 'Zebra',
          url: 'https://zebra.com',
          tags: [],
          isFavorite: false,
          clickCount: 10,
          visitTimestamps: [],
        },
        {
          id: '2',
          title: 'Apple',
          url: 'https://apple.com',
          tags: [],
          isFavorite: false,
          clickCount: 10,
          visitTimestamps: [],
        },
      ];

      const tiesMostVisited = getMostVisitedBookmarks(tiesBookmarks, 2);
      expect(tiesMostVisited[0].title).toBe('Apple');
      expect(tiesMostVisited[1].title).toBe('Zebra');
    });
  });

  describe('Edge Cases', () => {
    it('should handle bookmarks with no visits', () => {
      const noVisitsBookmarks = [
        {
          id: '1',
          title: 'No Visits',
          url: 'https://novisits.com',
          tags: [],
          isFavorite: false,
          clickCount: 0,
          visitTimestamps: [],
        },
      ];

      const mostVisited = getMostVisitedBookmarks(noVisitsBookmarks, 5);
      expect(mostVisited).toEqual([]);
    });

    it('should handle malformed URLs in domain analytics', () => {
      const malformedBookmarks = [
        {
          id: '1',
          title: 'Valid URL',
          url: 'https://valid.com',
          tags: [],
          isFavorite: false,
          clickCount: 0,
          visitTimestamps: [],
        },
        {
          id: '2',
          title: 'Invalid URL',
          url: 'not-a-url',
          tags: [],
          isFavorite: false,
          clickCount: 0,
          visitTimestamps: [],
        },
      ];

      const domains = getFrequentlySavedDomains(malformedBookmarks, 5);
      expect(domains).toHaveLength(1);
      expect(domains[0]).toEqual({ domain: 'valid.com', count: 1 });
    });

    it('should handle bookmarks with special characters in titles', () => {
      const specialCharBookmarks = [
        {
          id: '1',
          title: 'Special chars: !@#$%^&*()',
          url: 'https://special.com',
          tags: ['special'],
          isFavorite: false,
          clickCount: 15,
          visitTimestamps: [],
        },
        {
          id: '2',
          title: 'Unicode: 测试 🚀',
          url: 'https://unicode.com',
          tags: ['unicode'],
          isFavorite: false,
          clickCount: 10,
          visitTimestamps: [],
        },
      ];

      const mostVisited = getMostVisitedBookmarks(specialCharBookmarks);
      expect(mostVisited).toHaveLength(2);
      expect(mostVisited[0].title).toBe('Special chars: !@#$%^&*()');
      expect(mostVisited[1].title).toBe('Unicode: 测试 🚀');
    });
  });
});
