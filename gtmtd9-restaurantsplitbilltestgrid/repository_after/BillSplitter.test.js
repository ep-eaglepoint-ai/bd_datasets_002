// filename: repository_after/BillSplitter.test.js
import { describe, it, expect } from 'vitest';
import { splitBill } from '../repository_before/BillSplitter.js';

/**
 * Test Suite for BillSplitter
 * Tests the implementation in repository_before/BillSplitter.js
 * Covers all 8 requirements from the specification.
 */
describe('BillSplitter Test Suite', () => {

  // ============================================================
  // REQUIREMENT 1: Penny-Perfect Reconciliation
  // ============================================================
  describe('Requirement 1: Penny-Perfect Reconciliation', () => {
    it('should split $100.00 bill 3 ways with 10% tax and 15% tip to precisely 126.50', () => {
      const result = splitBill(100, 10, 15, 3);
      const expectedTotal = 100 * (1 + 10 / 100) * (1 + 15 / 100);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      const actualSumCents = Math.round(actualSum * 100);
      const expectedTotalCents = Math.round(expectedTotal * 100);
      
      expect(actualSumCents).toBe(expectedTotalCents);
      expect(actualSumCents).toBe(12650);
    });

    it('should maintain penny-perfect accuracy for 7-person split', () => {
      const result = splitBill(100, 10, 15, 7);
      const expectedTotal = 100 * 1.10 * 1.15;
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should be penny-perfect for prime number party sizes', () => {
      [3, 7].forEach(people => {
        const result = splitBill(100, 10, 15, people);
        const expectedTotal = 100 * 1.10 * 1.15;
        const actualSum = result.reduce((acc, val) => acc + val, 0);
        
        expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
      });
    });
  });

  // ============================================================
  // REQUIREMENT 2: Remainder Allocation Check
  // ============================================================
  describe('Requirement 2: Remainder Allocation Check', () => {
    it('should assign remainder penny exclusively to result[0] for 10/3 split', () => {
      const result = splitBill(10, 0, 0, 3);
      
      expect(result[0]).toBe(3.34);
      expect(result[1]).toBe(3.33);
      expect(result[2]).toBe(3.33);
    });

    it('should not distribute remainder as fractions of a cent', () => {
      const result = splitBill(10, 0, 0, 3);
      
      result.forEach((value) => {
        const cents = value * 100;
        expect(Math.abs(cents - Math.round(cents))).toBeLessThan(0.0001);
      });
    });

    it('should verify lead payer always has highest or equal amount', () => {
      const testCases = [
        { total: 10, tax: 0, tip: 0, people: 3 },
        { total: 100, tax: 10, tip: 15, people: 7 },
        { total: 50, tax: 5, tip: 20, people: 4 },
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
  // ============================================================
  describe('Requirement 3: Percentage Boundary Validation', () => {
    it('should handle 0% tax correctly without NaN', () => {
      const result = splitBill(100, 0, 15, 4);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(11500);
      expect(result.every(val => !isNaN(val) && val > 0)).toBe(true);
    });

    it('should handle 0% tip correctly without NaN', () => {
      const result = splitBill(100, 10, 0, 4);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(11000);
      expect(result.every(val => !isNaN(val) && val > 0)).toBe(true);
    });

    it('should handle both 0% tax and 0% tip correctly', () => {
      const result = splitBill(100, 0, 0, 4);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(actualSum).toBe(100);
      expect(result.every(val => val === 25)).toBe(true);
      expect(result.every(val => !isNaN(val) && val > 0)).toBe(true);
    });

    it('should not return NaN or zero for any zero percentage scenario', () => {
      const scenarios = [
        { total: 50, tax: 0, tip: 0, people: 2 },
        { total: 75, tax: 0, tip: 10, people: 3 },
        { total: 120, tax: 8, tip: 0, people: 6 },
      ];

      scenarios.forEach(({ total, tax, tip, people }) => {
        const result = splitBill(total, tax, tip, people);
        expect(result.every(val => !isNaN(val))).toBe(true);
        expect(result.every(val => val > 0)).toBe(true);
      });
    });
  });

  // ============================================================
  // REQUIREMENT 4: Invalid Input Resilience
  // ============================================================
  describe('Requirement 4: Invalid Input Resilience', () => {
    it('should return empty array for 0 people (avoid divide by zero)', () => {
      const result = splitBill(100, 10, 15, 0);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return empty array for -1 people', () => {
      const result = splitBill(100, 10, 15, -1);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
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

    it('should not attempt division by zero', () => {
      const result = splitBill(100, 10, 15, 0);
      expect(result).not.toContain(Infinity);
      expect(result).not.toContain(-Infinity);
      expect(result).not.toContain(NaN);
    });
  });

  // ============================================================
  // REQUIREMENT 5: Floating-Point Error Prevention
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

    it('should handle problematic floating-point numbers (0.1 + 0.2 issue)', () => {
      const result = splitBill(0.30, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(30);
    });

    it('should handle high-volume batch of varying amounts without floating-point errors', () => {
      const testAmounts = [
        { total: 19.99, tax: 8.25, tip: 18, people: 7 },
        { total: 4.32, tax: 6.5, tip: 20, people: 3 },
        { total: 123.45, tax: 9.25, tip: 22, people: 11 },
        { total: 0.99, tax: 5, tip: 15, people: 3 },
        { total: 999.99, tax: 10, tip: 20, people: 13 },
      ];

      testAmounts.forEach(({ total, tax, tip, people }) => {
        const result = splitBill(total, tax, tip, people);
        const actualSum = result.reduce((acc, val) => acc + val, 0);
        const expectedTotal = total * (1 + tax / 100) * (1 + tip / 100);
        
        expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
      });
    });

    it('should ensure all values are properly rounded to cents', () => {
      const result = splitBill(19.99, 8.25, 18, 7);
      result.forEach(val => {
        const cents = val * 100;
        expect(Math.abs(cents - Math.round(cents))).toBeLessThan(0.0001);
      });
    });
  });

  // ============================================================
  // REQUIREMENT 6: Happy Path
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
  });

  // ============================================================
  // REQUIREMENT 7: Lead Payer Logic
  // ============================================================
  describe('Requirement 7: Lead Payer Logic', () => {
    it('should split $0.05 among 3 people with first paying 0.03 and others 0.01', () => {
      const result = splitBill(0.05, 0, 0, 3);
      
      expect(result[0]).toBe(0.03);
      expect(result[1]).toBe(0.01);
      expect(result[2]).toBe(0.01);
    });

    it('should verify total of $0.05 split equals $0.05', () => {
      const result = splitBill(0.05, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(5);
    });

    it('should handle $0.01 split among 3 people correctly', () => {
      const result = splitBill(0.01, 0, 0, 3);
      
      expect(result[0]).toBe(0.01);
      expect(result[1]).toBe(0.00);
      expect(result[2]).toBe(0.00);
    });

    it('should handle $0.04 split among 3 people correctly', () => {
      const result = splitBill(0.04, 0, 0, 3);
      
      expect(result[0]).toBe(0.02);
      expect(result[1]).toBe(0.01);
      expect(result[2]).toBe(0.01);
    });

    it('should assign all remainder to first index only', () => {
      const result = splitBill(0.07, 0, 0, 3);
      // 7 cents / 3 = 2 cents each with 1 remainder
      expect(result[0]).toBe(0.03);
      expect(result[1]).toBe(0.02);
      expect(result[2]).toBe(0.02);
    });
  });

  // ============================================================
  // REQUIREMENT 8: Code Coverage (100% statement/branch)
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

    it('should execute main calculation path with valid inputs', () => {
      const result = splitBill(100, 10, 15, 4);
      expect(result.length).toBe(4);
      expect(result.every(v => typeof v === 'number')).toBe(true);
    });

    it('should execute remainder allocation branch when remainder > 0', () => {
      const result = splitBill(10, 0, 0, 3);
      // 1000 cents / 3 = 333 each, remainder = 1
      expect(result[0]).toBeGreaterThan(result[1]);
    });

    it('should execute path where remainder is 0 (even division)', () => {
      const result = splitBill(10, 0, 0, 2);
      expect(result[0]).toBe(result[1]);
    });

    it('should cover totalWithTax calculation line', () => {
      const result = splitBill(100, 10, 0, 1);
      expect(result[0]).toBe(110.00);
    });

    it('should cover finalAmount calculation line', () => {
      const result = splitBill(100, 0, 20, 1);
      expect(result[0]).toBe(120.00);
    });

    it('should cover combined tax and tip calculation', () => {
      const result = splitBill(100, 10, 20, 1);
      // 100 * 1.10 * 1.20 = 132.00
      expect(result[0]).toBe(132.00);
    });

    it('should cover Math.round in totalCents calculation', () => {
      const result = splitBill(10.005, 0, 0, 1);
      // 10.005 * 100 = 1000.5, rounds to 1001 cents = 10.01
      expect(result[0]).toBe(10.01);
    });

    it('should cover Math.floor in perPersonCents calculation', () => {
      const result = splitBill(10, 0, 0, 3);
      // 1000 / 3 = 333.33..., floor = 333
      expect(result[1]).toBe(3.33);
    });

    it('should cover Array.fill operation', () => {
      const result = splitBill(100, 0, 0, 5);
      expect(result.length).toBe(5);
      expect(new Set(result.slice(1)).size).toBe(1); // All others equal
    });

    it('should cover Array.map cents to dollars conversion', () => {
      const result = splitBill(100, 0, 0, 2);
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(v => typeof v === 'number')).toBe(true);
    });
  });
});