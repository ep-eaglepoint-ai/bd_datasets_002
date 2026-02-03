import { format, parseISO, addHours, subHours } from 'date-fns';

describe('Timezone Handling Tests', () => {
  describe('Date Storage Consistency', () => {
    test('should store dates in ISO format regardless of local timezone', () => {
      const localDate = new Date();
      const isoString = localDate.toISOString();
      
      // ISO string should always end with Z (UTC)
      expect(isoString).toMatch(/Z$/);
      
      // Should be parseable back to the same timestamp
      const parsed = parseISO(isoString);
      expect(parsed.getTime()).toBe(localDate.getTime());
    });

    test('should handle dates created in different timezones', () => {
      // Simulating a date from UTC+0
      const utcDate = new Date('2024-06-15T12:00:00.000Z');
      
      // Same instant in different representations
      const utcTimestamp = utcDate.getTime();
      
      // Create date in different timezone representation
      const pacificTime = '2024-06-15T05:00:00.000-07:00'; // Same instant, PST
      const pacificDate = new Date(pacificTime);
      
      expect(pacificDate.getTime()).toBe(utcTimestamp);
    });

    test('should maintain consistency when parsing user-input dates', () => {
      // User enters date in local format
      const userInput = '2024-12-25';
      
      // Parse as local date
      const localDate = new Date(userInput + 'T00:00:00');
      
      // Store as ISO
      const stored = localDate.toISOString();
      
      // Retrieve and display
      const retrieved = parseISO(stored);
      
      // Should maintain the same date parts
      expect(retrieved.getFullYear()).toBe(2024);
      expect(retrieved.getMonth()).toBe(11); // December is 11
      expect(retrieved.getDate()).toBe(25);
    });
  });

  describe('DST (Daylight Saving Time) Edge Cases', () => {
    test('should handle spring forward DST transition', () => {
      // March 10, 2024 - US DST spring forward
      const beforeDst = new Date('2024-03-10T01:30:00.000Z');
      const afterDst = addHours(beforeDst, 2);
      
      const diff = (afterDst.getTime() - beforeDst.getTime()) / (1000 * 60 * 60);
      expect(diff).toBe(2); // Should still be 2 hours in UTC
    });

    test('should handle fall back DST transition', () => {
      // November 3, 2024 - US DST fall back
      const beforeDst = new Date('2024-11-03T05:30:00.000Z');
      const afterDst = addHours(beforeDst, 2);
      
      const diff = (afterDst.getTime() - beforeDst.getTime()) / (1000 * 60 * 60);
      expect(diff).toBe(2); // Should still be 2 hours in UTC
    });

    test('should correctly calculate days between dates across DST', () => {
      const marchStart = new Date('2024-03-08T12:00:00.000Z');
      const marchEnd = new Date('2024-03-12T12:00:00.000Z');
      
      const daysDiff = Math.round((marchEnd.getTime() - marchStart.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(4);
    });
  });

  describe('Deadline Calculations', () => {
    test('should correctly determine if deadline is passed', () => {
      const now = new Date();
      const pastDeadline = subHours(now, 24);
      const futureDeadline = addHours(now, 24);
      
      const isPast = (deadline: Date) => deadline.getTime() < now.getTime();
      
      expect(isPast(pastDeadline)).toBe(true);
      expect(isPast(futureDeadline)).toBe(false);
    });

    test('should handle deadline at midnight in different timezones', () => {
      // Deadline set as end of day UTC
      const deadlineUtc = new Date('2024-12-31T23:59:59.999Z');
      
      // Current time in UTC
      const currentTimeUtc = new Date('2024-12-31T22:00:00.000Z');
      
      // Should not be past deadline
      expect(deadlineUtc.getTime() > currentTimeUtc.getTime()).toBe(true);
    });

    test('should calculate remaining time correctly', () => {
      const now = new Date('2024-06-15T12:00:00.000Z');
      const deadline = new Date('2024-06-17T12:00:00.000Z');
      
      const remainingMs = deadline.getTime() - now.getTime();
      const remainingDays = remainingMs / (1000 * 60 * 60 * 24);
      
      expect(remainingDays).toBe(2);
    });
  });

  describe('Progress Update Timestamps', () => {
    test('should order updates correctly regardless of timezone', () => {
      const updates = [
        { id: '1', createdAt: '2024-06-15T10:00:00.000Z' },
        { id: '2', createdAt: '2024-06-15T08:00:00.000-05:00' }, // 13:00 UTC
        { id: '3', createdAt: '2024-06-15T11:00:00.000Z' },
      ];
      
      const sorted = updates.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      expect(sorted[0].id).toBe('1'); // 10:00 UTC
      expect(sorted[1].id).toBe('3'); // 11:00 UTC
      expect(sorted[2].id).toBe('2'); // 13:00 UTC
    });

    test('should handle velocity calculation across timezone boundaries', () => {
      // Updates over 2 days
      const update1 = { percentage: 10, createdAt: '2024-06-14T23:00:00.000Z' };
      const update2 = { percentage: 30, createdAt: '2024-06-16T01:00:00.000Z' };
      
      const days = (new Date(update2.createdAt).getTime() - new Date(update1.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const velocity = (update2.percentage - update1.percentage) / days;
      
      // 20% progress over ~1.08 days = ~18.5% per day
      expect(velocity).toBeGreaterThan(0);
      expect(days).toBeCloseTo(1.08, 1);
    });
  });
});
