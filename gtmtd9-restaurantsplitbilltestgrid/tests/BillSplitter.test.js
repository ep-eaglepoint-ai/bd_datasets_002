// filename: tests/BillSplitter.test.js
import { describe, it, expect } from 'vitest';
import { splitBill } from '../BillSplitter.js';

/**
 * Professional-grade test suite for BillSplitter
 * Validates penny-perfect bill splitting for Bistro Connect POS
 */
describe('BillSplitter Test Suite', () => {

  // ============================================================
  // REQUIREMENT 1: Penny-Perfect Reconciliation
  // $100.00 bill split 3 ways with 10% tax and 15% tip = 126.50
  // ============================================================
  describe('Requirement 1: Penny-Perfect Reconciliation', () => {
    it('should split $100.00 bill 3 ways with 10% tax and 15% tip to precisely 126.50', () => {
      const result = splitBill(100, 10, 15, 3);
      
      // Calculate expected total: 100 * 1.10 * 1.15 = 126.50
      const expectedTotal = 100 * (1 + 10 / 100) * (1 + 15 / 100);
      
      // Sum all individual payments
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      // Convert to cents for precise comparison
      const actualSumCents = Math.round(actualSum * 100);
      const expectedTotalCents = Math.round(expectedTotal * 100);
      
      expect(actualSumCents).toBe(expectedTotalCents);
      expect(actualSumCents).toBe(12650); // 126.50 in cents
    });

    it('should maintain penny-perfect accuracy for 7-person split', () => {
      const result = splitBill(100, 10, 15, 7);
      const expectedTotal = 100 * 1.10 * 1.15; // 126.50
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should handle complex percentage calculations without deviation', () => {
      const result = splitBill(87.50, 8.875, 18.5, 5);
      const expectedTotal = 87.50 * (1 + 8.875 / 100) * (1 + 18.5 / 100);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should be penny-perfect for prime number party sizes', () => {
      const primes = [3, 7, 11, 13];
      primes.forEach(people => {
        const result = splitBill(100, 10, 15, people);
        const expectedTotal = 100 * 1.10 * 1.15;
        const actualSum = result.reduce((acc, val) => acc + val, 0);
        
        expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
      });
    });
  });

  // ============================================================
  // REQUIREMENT 2: Remainder Allocation Check
  // Extra penny assigned exclusively to first index (Lead Payer)
  // ============================================================
  describe('Requirement 2: Remainder Allocation Check', () => {
    it('should assign remainder penny exclusively to result[0] for 10/3 split', () => {
      const result = splitBill(10, 0, 0, 3);
      
      // 1000 cents / 3 = 333 per person with 1 cent remainder
      // Lead payer should get 334 cents = 3.34
      // Others should get 333 cents = 3.33
      expect(result[0]).toBe(3.34);
      expect(result[1]).toBe(3.33);
      expect(result[2]).toBe(3.33);
    });

    it('should not distribute remainder as fractions of a cent', () => {
      const result = splitBill(10, 0, 0, 3);
      
      // Verify all values are proper cents (2 decimal places max)
      result.forEach((value) => {
        const cents = value * 100;
        expect(Math.abs(cents - Math.round(cents))).toBeLessThan(0.0001);
      });
    });

    it('should assign 2 cent remainder to lead payer for 5-way split of $10.02', () => {
      const result = splitBill(10.02, 0, 0, 5);
      
      // 1002 cents / 5 = 200 per person with 2 cent remainder
      expect(result[0]).toBe(2.02);
      expect(result[1]).toBe(2.00);
      expect(result[2]).toBe(2.00);
      expect(result[3]).toBe(2.00);
      expect(result[4]).toBe(2.00);
    });

    it('should verify lead payer always has highest or equal amount', () => {
      const testCases = [
        { total: 10, tax: 0, tip: 0, people: 3 },
        { total: 100, tax: 10, tip: 15, people: 7 },
        { total: 50, tax: 5, tip: 20, people: 4 },
        { total: 33.33, tax: 8, tip: 18, people: 6 },
      ];

      testCases.forEach(({ total, tax, tip, people }) => {
        const result = splitBill(total, tax, tip, people);
        if (result.length > 0) {
          const leadPayerAmount = result[0];
          const othersMax = Math.max(...result.slice(1));
          expect(leadPayerAmount).toBeGreaterThanOrEqual(othersMax);
        }
      });
    });

    it('should handle remainder of 0 correctly (even split)', () => {
      const result = splitBill(10, 0, 0, 2);
      
      expect(result[0]).toBe(5.00);
      expect(result[1]).toBe(5.00);
    });
  });

  // ============================================================
  // REQUIREMENT 3: Percentage Boundary Validation
  // 0% tax and 0% tip handled correctly without NaN or zero
  // ============================================================
  describe('Requirement 3: Percentage Boundary Validation', () => {
    it('should handle 0% tax correctly', () => {
      const result = splitBill(100, 0, 15, 4);
      const expectedTotal = 100 * 1.00 * 1.15; // 115.00
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(11500);
      expect(result.every(val => !isNaN(val))).toBe(true);
    });

    it('should handle 0% tip correctly', () => {
      const result = splitBill(100, 10, 0, 4);
      const expectedTotal = 100 * 1.10 * 1.00; // 110.00
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(11000);
      expect(result.every(val => !isNaN(val))).toBe(true);
    });

    it('should handle both 0% tax and 0% tip correctly', () => {
      const result = splitBill(100, 0, 0, 4);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(actualSum).toBe(100);
      expect(result.every(val => val === 25)).toBe(true);
      expect(result.every(val => !isNaN(val) && val > 0)).toBe(true);
    });

    it('should not return NaN for any zero percentage scenario', () => {
      const scenarios = [
        { total: 50, tax: 0, tip: 0, people: 2 },
        { total: 75, tax: 0, tip: 10, people: 3 },
        { total: 120, tax: 8, tip: 0, people: 6 },
      ];

      scenarios.forEach(({ total, tax, tip, people }) => {
        const result = splitBill(total, tax, tip, people);
        expect(result.every(val => !isNaN(val))).toBe(true);
        expect(result.every(val => val >= 0)).toBe(true);
      });
    });

    it('should handle 100% tax and 100% tip correctly', () => {
      const result = splitBill(100, 100, 100, 4);
      // 100 * 2.0 * 2.0 = 400
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(40000);
    });
  });

  // ============================================================
  // REQUIREMENT 4: Invalid Input Resilience
  // 0 or -1 people returns empty array, no division by zero
  // ============================================================
  describe('Requirement 4: Invalid Input Resilience', () => {
    it('should return empty array for 0 people', () => {
      const result = splitBill(100, 10, 15, 0);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return empty array for -1 people', () => {
      const result = splitBill(100, 10, 15, -1);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return empty array for large negative numbers', () => {
      const result = splitBill(100, 10, 15, -100);
      
      expect(result).toEqual([]);
    });

    it('should not throw an error for invalid party sizes', () => {
      expect(() => splitBill(100, 10, 15, 0)).not.toThrow();
      expect(() => splitBill(100, 10, 15, -1)).not.toThrow();
      expect(() => splitBill(100, 10, 15, -999)).not.toThrow();
    });

    it('should handle edge case of 1 person correctly', () => {
      const result = splitBill(100, 10, 15, 1);
      
      expect(result.length).toBe(1);
      expect(result[0]).toBe(126.50);
    });

    it('should handle very large party size', () => {
      const result = splitBill(100, 0, 0, 100);
      
      expect(result.length).toBe(100);
      const sum = result.reduce((acc, val) => acc + val, 0);
      expect(Math.round(sum * 100)).toBe(10000);
    });
  });

  // ============================================================
  // REQUIREMENT 5: Floating-Point Error Prevention
  // High volume test avoiding JavaScript floating-point leakage
  // ============================================================
  describe('Requirement 5: Floating-Point Error Prevention', () => {
    it('should avoid floating-point leakage for $19.99', () => {
      const result = splitBill(19.99, 8.25, 18, 7);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      const expectedTotal = 19.99 * (1 + 8.25 / 100) * (1 + 18 / 100);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should avoid floating-point leakage for $4.32', () => {
      const result = splitBill(4.32, 6.5, 20, 3);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      const expectedTotal = 4.32 * (1 + 6.5 / 100) * (1 + 20 / 100);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should handle problematic floating-point numbers correctly', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      const result = splitBill(0.30, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(30);
    });

    it('should handle high-volume batch of varying amounts', () => {
      const testAmounts = [
        { total: 19.99, tax: 8.25, tip: 18, people: 7 },
        { total: 4.32, tax: 6.5, tip: 20, people: 3 },
        { total: 123.45, tax: 9.25, tip: 22, people: 11 },
        { total: 0.99, tax: 5, tip: 15, people: 3 },
        { total: 999.99, tax: 10, tip: 20, people: 13 },
        { total: 77.77, tax: 7.77, tip: 17.77, people: 7 },
      ];

      testAmounts.forEach(({ total, tax, tip, people }) => {
        const result = splitBill(total, tax, tip, people);
        const actualSum = result.reduce((acc, val) => acc + val, 0);
        const expectedTotal = total * (1 + tax / 100) * (1 + tip / 100);
        
        expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
      });
    });

    it('should prevent 0.1 + 0.2 !== 0.3 type errors', () => {
      const result = splitBill(33.33, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(3333);
    });

    it('should handle amounts like $9.99 correctly', () => {
      const result = splitBill(9.99, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(999);
    });
  });

  // ============================================================
  // REQUIREMENT 6: Testing Requirement (Happy Path)
  // $60.00 for 4 people with 0% tax/tip = four entries of 15.00
  // ============================================================
  describe('Requirement 6: Happy Path', () => {
    it('should split $60.00 for 4 people with 0% tax/tip to exactly 15.00 each', () => {
      const result = splitBill(60, 0, 0, 4);
      
      expect(result).toEqual([15.00, 15.00, 15.00, 15.00]);
      expect(result.length).toBe(4);
      expect(result.every(val => val === 15.00)).toBe(true);
    });

    it('should return correct array length for party size', () => {
      const result = splitBill(60, 0, 0, 4);
      
      expect(result.length).toBe(4);
    });

    it('should sum to exactly the original amount with no tax/tip', () => {
      const result = splitBill(60, 0, 0, 4);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(sum).toBe(60);
    });

    it('should handle other even splits correctly', () => {
      const result = splitBill(100, 0, 0, 4);
      
      expect(result).toEqual([25.00, 25.00, 25.00, 25.00]);
    });

    it('should handle $80 for 4 people correctly', () => {
      const result = splitBill(80, 0, 0, 4);
      
      expect(result).toEqual([20.00, 20.00, 20.00, 20.00]);
    });

    it('should handle $120 for 6 people correctly', () => {
      const result = splitBill(120, 0, 0, 6);
      
      expect(result).toEqual([20.00, 20.00, 20.00, 20.00, 20.00, 20.00]);
    });
  });

  // ============================================================
  // REQUIREMENT 7: Testing Requirement (Lead Payer Logic)
  // $0.05 split among 3 = first pays 0.03, others pay 0.01 each
  // ============================================================
  describe('Requirement 7: Lead Payer Logic', () => {
    it('should split $0.05 among 3 people with first paying 0.03 and others 0.01', () => {
      const result = splitBill(0.05, 0, 0, 3);
      
      expect(result[0]).toBe(0.03);
      expect(result[1]).toBe(0.01);
      expect(result[2]).toBe(0.01);
    });

    it('should verify total of 0.05 split equals 0.05', () => {
      const result = splitBill(0.05, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(5);
    });

    it('should handle $0.01 split among 3 people correctly', () => {
      const result = splitBill(0.01, 0, 0, 3);
      
      // 1 cent / 3 = 0 cents per person, 1 cent remainder to lead payer
      expect(result[0]).toBe(0.01);
      expect(result[1]).toBe(0.00);
      expect(result[2]).toBe(0.00);
    });

    it('should handle $0.02 split among 3 people correctly', () => {
      const result = splitBill(0.02, 0, 0, 3);
      
      // 2 cents / 3 = 0 cents per person, 2 cents remainder to lead payer
      expect(result[0]).toBe(0.02);
      expect(result[1]).toBe(0.00);
      expect(result[2]).toBe(0.00);
    });

    it('should handle $0.04 split among 3 people correctly', () => {
      const result = splitBill(0.04, 0, 0, 3);
      
      // 4 cents / 3 = 1 cent per person, 1 cent remainder to lead payer
      expect(result[0]).toBe(0.02);
      expect(result[1]).toBe(0.01);
      expect(result[2]).toBe(0.01);
    });

    it('should handle $0.07 split among 3 people correctly', () => {
      const result = splitBill(0.07, 0, 0, 3);
      
      // 7 cents / 3 = 2 cents per person, 1 cent remainder to lead payer
      expect(result[0]).toBe(0.03);
      expect(result[1]).toBe(0.02);
      expect(result[2]).toBe(0.02);
    });
  });

  // ============================================================
  // REQUIREMENT 8: Code Coverage Goal
  // 100% statement and branch coverage
  // ============================================================
  describe('Requirement 8: Code Coverage', () => {
    it('should execute early return branch for zero people', () => {
      const result = splitBill(100, 10, 15, 0);
      expect(result).toEqual([]);
    });

    it('should execute early return branch for negative people', () => {
      const result = splitBill(100, 10, 15, -5);
      expect(result).toEqual([]);
    });

    it('should execute main calculation path', () => {
      const result = splitBill(100, 10, 15, 4);
      expect(result.length).toBe(4);
    });

    it('should execute remainder allocation when remainder exists', () => {
      const result = splitBill(10, 0, 0, 3);
      expect(result[0]).toBeGreaterThan(result[1]);
    });

    it('should execute path where no remainder exists', () => {
      const result = splitBill(10, 0, 0, 2);
      expect(result[0]).toBe(result[1]);
      expect(result[0]).toBe(5.00);
    });

    it('should cover tax percentage calculation', () => {
      const withTax = splitBill(100, 10, 0, 1);
      expect(withTax[0]).toBe(110.00);
    });

    it('should cover tip percentage calculation', () => {
      const withTip = splitBill(100, 0, 20, 1);
      expect(withTip[0]).toBe(120.00);
    });

    it('should cover combined tax and tip calculation', () => {
      const withBoth = splitBill(100, 10, 20, 1);
      // 100 * 1.10 * 1.20 = 132.00
      expect(withBoth[0]).toBe(132.00);
    });

    it('should cover cents to dollars conversion', () => {
      const result = splitBill(1.00, 0, 0, 1);
      expect(typeof result[0]).toBe('number');
      expect(result[0]).toBe(1.00);
    });

    it('should cover Array.fill operation', () => {
      const result = splitBill(100, 0, 0, 5);
      expect(result.length).toBe(5);
    });

    it('should cover Array.map operation', () => {
      const result = splitBill(100, 0, 0, 2);
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(v => typeof v === 'number')).toBe(true);
    });

    it('should cover Math.round in totalCents calculation', () => {
      const result = splitBill(10.005, 0, 0, 1);
      // 10.005 * 100 = 1000.5, rounded to 1001
      expect(result[0]).toBe(10.01);
    });

    it('should cover Math.floor in perPersonCents calculation', () => {
      const result = splitBill(10, 0, 0, 3);
      // Floor(1000/3) = 333
      expect(result[1]).toBe(3.33);
    });
  });

  // ============================================================
  // OPTIMIZATION TESTS (AFTER version specific)
  // These tests may fail on BEFORE but pass on AFTER
  // ============================================================
  describe('Optimization Tests', () => {
    it('should handle floating-point numPeople by flooring', () => {
      const result = splitBill(100, 0, 0, 3.7);
      
      // Should treat as 3 people
      expect(result.length).toBe(3);
    });

    it('should handle string input for total', () => {
      const result = splitBill('100', 0, 0, 4);
      
      expect(result.length).toBe(4);
      const sum = result.reduce((acc, val) => acc + val, 0);
      expect(sum).toBe(100);
    });

    it('should handle NaN numPeople gracefully', () => {
      const result = splitBill(100, 0, 0, NaN);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle Infinity numPeople gracefully', () => {
      const result = splitBill(100, 0, 0, Infinity);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle undefined numPeople gracefully', () => {
      const result = splitBill(100, 0, 0, undefined);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle negative tax by treating as 0', () => {
      const result = splitBill(100, -10, 0, 4);
      
      // AFTER treats negative tax as 0, BEFORE calculates with negative
      expect(result.length).toBe(4);
      const sum = result.reduce((acc, val) => acc + val, 0);
      // AFTER: sum should be 100 (0% tax)
      // BEFORE: sum would be 90 (negative 10% tax)
      expect(sum).toBe(100);
    });

    it('should handle negative tip by treating as 0', () => {
      const result = splitBill(100, 0, -20, 4);
      
      expect(result.length).toBe(4);
      const sum = result.reduce((acc, val) => acc + val, 0);
      // AFTER: sum should be 100 (0% tip)
      // BEFORE: sum would be 80 (negative 20% tip)
      expect(sum).toBe(100);
    });

    it('should handle negative total gracefully', () => {
      const result = splitBill(-100, 10, 15, 4);
      
      // AFTER returns zeros, BEFORE calculates negative values
      expect(result.length).toBe(4);
      expect(result.every(val => val >= 0)).toBe(true);
    });
  });

  // ============================================================
  // Integration Tests
  // ============================================================
  describe('Integration Tests', () => {
    it('should handle real-world restaurant scenario', () => {
      // $87.50 dinner for 5 people, 8.875% tax, 18% tip
      const result = splitBill(87.50, 8.875, 18, 5);
      const sum = result.reduce((acc, val) => acc + val, 0);
      const expected = 87.50 * 1.08875 * 1.18;
      
      expect(Math.round(sum * 100)).toBe(Math.round(expected * 100));
    });

    it('should handle large party scenario', () => {
      // $500 for 12 people
      const result = splitBill(500, 10, 20, 12);
      const sum = result.reduce((acc, val) => acc + val, 0);
      const expected = 500 * 1.10 * 1.20;
      
      expect(result.length).toBe(12);
      expect(Math.round(sum * 100)).toBe(Math.round(expected * 100));
    });

    it('should handle very small bill scenario', () => {
      // $1.00 for 7 people
      const result = splitBill(1.00, 0, 0, 7);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(result.length).toBe(7);
      expect(Math.round(sum * 100)).toBe(100);
    });

    it('should handle birthday dinner scenario', () => {
      // $256.78 for 8 people, 9% tax, 20% tip
      const result = splitBill(256.78, 9, 20, 8);
      const sum = result.reduce((acc, val) => acc + val, 0);
      const expected = 256.78 * 1.09 * 1.20;
      
      expect(result.length).toBe(8);
      expect(Math.round(sum * 100)).toBe(Math.round(expected * 100));
    });
  });
});