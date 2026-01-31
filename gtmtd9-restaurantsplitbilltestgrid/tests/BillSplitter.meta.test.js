// filename: tests/BillSplitter.meta.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { splitBill } from '../repository_before/BillSplitter.js';

/**
 * META-TEST SUITE
 * Tests the quality and completeness of the test suite in repository_after.
 * Verifies that all 8 requirements are properly tested.
 * 
 * IMPORTANT: This suite ACTUALLY RUNS splitBill to verify correctness,
 * not just checking if strings exist in the test file.
 */

const TEST_FILE_PATH = join(process.cwd(), 'repository_after', 'BillSplitter.test.js');
let testFileContent = '';

beforeAll(() => {
  testFileContent = readFileSync(TEST_FILE_PATH, 'utf-8');
});

describe('Meta-Tests: Verifying Test Suite Quality', () => {

  // ============================================================
  // REQUIREMENT 1: ACTUAL VERIFICATION - Penny-Perfect Reconciliation
  // ============================================================
  describe('Requirement 1: Penny-Perfect Reconciliation (Actual Execution)', () => {
    
    it('should ACTUALLY verify $100 with 10% tax and 15% tip equals 12650 cents', () => {
      const result = splitBill(100, 10, 15, 3);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      const actualSumCents = Math.round(actualSum * 100);
      
      expect(actualSumCents).toBe(12650);
    });

    it('should ACTUALLY verify 7-person split is penny-perfect', () => {
      const result = splitBill(100, 10, 15, 7);
      const expectedTotal = 100 * 1.10 * 1.15;
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('test file should contain penny-perfect test case', () => {
      expect(testFileContent).toContain('Penny-Perfect');
      expect(testFileContent).toMatch(/splitBill\s*\(\s*100\s*,\s*10\s*,\s*15\s*,\s*3\s*\)/);
    });
  });

  // ============================================================
  // REQUIREMENT 2: ACTUAL VERIFICATION - Remainder Allocation
  // ============================================================
  describe('Requirement 2: Remainder Allocation (Actual Execution)', () => {
    
    it('should ACTUALLY verify $10 split 3 ways: first=3.34, others=3.33', () => {
      const result = splitBill(10, 0, 0, 3);
      
      expect(result[0]).toBe(3.34);
      expect(result[1]).toBe(3.33);
      expect(result[2]).toBe(3.33);
    });

    it('should ACTUALLY verify lead payer gets remainder', () => {
      const result = splitBill(10, 0, 0, 3);
      expect(result[0]).toBeGreaterThan(result[1]);
      expect(result[0]).toBeGreaterThan(result[2]);
    });

    it('test file should contain remainder allocation tests', () => {
      expect(testFileContent).toContain('Remainder');
      expect(testFileContent).toContain('result[0]');
    });
  });

  // ============================================================
  // REQUIREMENT 3: ACTUAL VERIFICATION - Percentage Boundaries
  // ============================================================
  describe('Requirement 3: Percentage Boundary Validation (Actual Execution)', () => {
    
    it('should ACTUALLY verify 0% tax produces valid numbers', () => {
      const result = splitBill(100, 0, 15, 4);
      
      expect(result.every(val => !isNaN(val))).toBe(true);
      expect(result.every(val => typeof val === 'number')).toBe(true);
      expect(Math.round(result.reduce((a, b) => a + b, 0) * 100)).toBe(11500);
    });

    it('should ACTUALLY verify 0% tip produces valid numbers', () => {
      const result = splitBill(100, 10, 0, 4);
      
      expect(result.every(val => !isNaN(val))).toBe(true);
      expect(Math.round(result.reduce((a, b) => a + b, 0) * 100)).toBe(11000);
    });

    it('should ACTUALLY verify 0% tax and 0% tip together', () => {
      const result = splitBill(100, 0, 0, 4);
      
      expect(result).toEqual([25, 25, 25, 25]);
    });

    it('test file should test zero percentage scenarios', () => {
      expect(testFileContent).toContain('0%');
      expect(testFileContent).toContain('isNaN');
    });
  });

  // ============================================================
  // REQUIREMENT 4: ACTUAL VERIFICATION - Invalid Input Resilience
  // ============================================================
  describe('Requirement 4: Invalid Input Resilience (Actual Execution)', () => {
    
    it('should ACTUALLY verify 0 people returns empty or throws', () => {
      let result;
      let didThrow = false;
      
      try {
        result = splitBill(100, 10, 15, 0);
      } catch (e) {
        didThrow = true;
      }
      
      // Either empty array or throws is acceptable per requirement
      if (!didThrow) {
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([]);
      } else {
        expect(didThrow).toBe(true);
      }
    });

    it('should ACTUALLY verify -1 people returns empty or throws', () => {
      let result;
      let didThrow = false;
      
      try {
        result = splitBill(100, 10, 15, -1);
      } catch (e) {
        didThrow = true;
      }
      
      if (!didThrow) {
        expect(result).toEqual([]);
      } else {
        expect(didThrow).toBe(true);
      }
    });

    it('should ACTUALLY verify no Infinity or NaN for invalid input', () => {
      let result;
      try {
        result = splitBill(100, 10, 15, 0);
      } catch (e) {
        return; // Throwing is acceptable
      }
      
      expect(result).not.toContain(Infinity);
      expect(result).not.toContain(-Infinity);
      expect(result.every(v => !isNaN(v))).toBe(true);
    });

    it('test file should handle both empty array and throw scenarios', () => {
      // Check that tests exist for invalid input
      expect(testFileContent).toContain('Invalid Input');
      // Check that tests handle both outcomes (toEqual([]) or try/catch)
      expect(testFileContent).toMatch(/toEqual\s*\(\s*\[\s*\]\s*\)|didThrow/);
    });
  });

  // ============================================================
  // REQUIREMENT 5: ACTUAL VERIFICATION - Floating-Point Prevention
  // ============================================================
  describe('Requirement 5: Floating-Point Error Prevention (Actual Execution)', () => {
    
    it('should ACTUALLY verify $19.99 with 8.25% tax and 18% tip is penny-perfect', () => {
      const result = splitBill(19.99, 8.25, 18, 7);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      const expectedTotal = 19.99 * (1 + 8.25 / 100) * (1 + 18 / 100);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should ACTUALLY verify $4.32 with 6.5% tax and 20% tip is penny-perfect', () => {
      const result = splitBill(4.32, 6.5, 20, 3);
      const actualSum = result.reduce((acc, val) => acc + val, 0);
      const expectedTotal = 4.32 * (1 + 6.5 / 100) * (1 + 20 / 100);
      
      expect(Math.round(actualSum * 100)).toBe(Math.round(expectedTotal * 100));
    });

    it('should ACTUALLY verify 0.30 split handles floating-point correctly', () => {
      const result = splitBill(0.30, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      // Classic 0.1 + 0.2 problem area
      expect(Math.round(sum * 100)).toBe(30);
    });

    it('should ACTUALLY verify all results are properly rounded to cents', () => {
      const result = splitBill(19.99, 8.25, 18, 7);
      result.forEach(val => {
        const cents = val * 100;
        expect(Math.abs(cents - Math.round(cents))).toBeLessThan(0.0001);
      });
    });

    it('test file should contain floating-point test cases', () => {
      expect(testFileContent).toContain('Floating-Point');
      expect(testFileContent).toContain('19.99');
      expect(testFileContent).toContain('4.32');
    });
  });

  // ============================================================
  // REQUIREMENT 6: ACTUAL VERIFICATION - Happy Path
  // ============================================================
  describe('Requirement 6: Happy Path (Actual Execution)', () => {
    
    it('should ACTUALLY verify $60 split 4 ways equals [15, 15, 15, 15]', () => {
      const result = splitBill(60, 0, 0, 4);
      
      expect(result).toEqual([15.00, 15.00, 15.00, 15.00]);
    });

    it('should ACTUALLY verify array length matches party size', () => {
      const result = splitBill(60, 0, 0, 4);
      expect(result.length).toBe(4);
    });

    it('should ACTUALLY verify sum equals original with no tax/tip', () => {
      const result = splitBill(60, 0, 0, 4);
      const sum = result.reduce((acc, val) => acc + val, 0);
      expect(sum).toBe(60);
    });

    it('test file should contain happy path test', () => {
      expect(testFileContent).toContain('Happy Path');
      expect(testFileContent).toMatch(/splitBill\s*\(\s*60\s*,\s*0\s*,\s*0\s*,\s*4\s*\)/);
    });
  });

  // ============================================================
  // REQUIREMENT 7: ACTUAL VERIFICATION - Lead Payer Logic
  // ============================================================
  describe('Requirement 7: Lead Payer Logic (Actual Execution)', () => {
    
    it('should ACTUALLY verify $0.05 split 3 ways: first=0.03, others=0.01', () => {
      const result = splitBill(0.05, 0, 0, 3);
      
      expect(result[0]).toBe(0.03);
      expect(result[1]).toBe(0.01);
      expect(result[2]).toBe(0.01);
    });

    it('should ACTUALLY verify $0.05 split sums to $0.05', () => {
      const result = splitBill(0.05, 0, 0, 3);
      const sum = result.reduce((acc, val) => acc + val, 0);
      
      expect(Math.round(sum * 100)).toBe(5);
    });

    it('should ACTUALLY verify $0.01 split 3 ways handles zero values', () => {
      const result = splitBill(0.01, 0, 0, 3);
      
      // Only 1 cent total - first person gets it, others get 0
      expect(result[0]).toBe(0.01);
      expect(result[1]).toBe(0.00);
      expect(result[2]).toBe(0.00);
      
      // Sum must still be correct
      const sum = result.reduce((acc, val) => acc + val, 0);
      expect(Math.round(sum * 100)).toBe(1);
    });

    it('should ACTUALLY verify $0.04 split 3 ways', () => {
      const result = splitBill(0.04, 0, 0, 3);
      
      expect(result[0]).toBe(0.02);
      expect(result[1]).toBe(0.01);
      expect(result[2]).toBe(0.01);
    });

    it('test file should contain lead payer tests', () => {
      expect(testFileContent).toContain('Lead Payer');
      expect(testFileContent).toMatch(/splitBill\s*\(\s*0\.05\s*,\s*0\s*,\s*0\s*,\s*3\s*\)/);
    });
  });

  // ============================================================
  // REQUIREMENT 8: Code Coverage Verification
  // ============================================================
  describe('Requirement 8: Code Coverage Verification', () => {
    
    it('should have test for early return branch (zero people)', () => {
      const result = splitBill(100, 10, 15, 0);
      expect(result).toEqual([]);
      expect(testFileContent).toContain('early return');
    });

    it('should have test for early return branch (negative people)', () => {
      const result = splitBill(100, 10, 15, -5);
      expect(result).toEqual([]);
    });

    it('should have test for remainder > 0 branch', () => {
      const result = splitBill(10, 0, 0, 3);
      expect(result[0]).toBeGreaterThan(result[1]);
      expect(testFileContent).toContain('remainder');
    });

    it('should have test for remainder = 0 branch (even split)', () => {
      const result = splitBill(10, 0, 0, 2);
      expect(result[0]).toBe(result[1]);
    });

    it('should have test for tax-only calculation', () => {
      const result = splitBill(100, 10, 0, 1);
      expect(result[0]).toBe(110.00);
    });

    it('should have test for tip-only calculation', () => {
      const result = splitBill(100, 0, 20, 1);
      expect(result[0]).toBe(120.00);
    });

    it('should have test for combined tax and tip', () => {
      const result = splitBill(100, 10, 20, 1);
      expect(result[0]).toBe(132.00);
    });

    it('test file should contain coverage tests', () => {
      expect(testFileContent).toContain('Requirement 8');
      expect(testFileContent).toContain('Coverage');
    });
  });

  // ============================================================
  // TEST STRUCTURE QUALITY
  // ============================================================
  describe('Test Structure Quality', () => {
    
    it('should use describe blocks for organization', () => {
      const describeCount = (testFileContent.match(/describe\s*\(/g) || []).length;
      expect(describeCount).toBeGreaterThanOrEqual(8);
    });

    it('should have sufficient number of test cases (30+)', () => {
      const itCount = (testFileContent.match(/\bit\s*\(/g) || []).length;
      expect(itCount).toBeGreaterThanOrEqual(30);
    });

    it('should use expect assertions (50+)', () => {
      const expectCount = (testFileContent.match(/expect\s*\(/g) || []).length;
      expect(expectCount).toBeGreaterThanOrEqual(50);
    });

    it('should import splitBill from repository_before', () => {
      expect(testFileContent).toMatch(/import\s*\{[^}]*splitBill[^}]*\}/);
      expect(testFileContent).toMatch(/from\s*['"]\.\.\/repository_before\/BillSplitter\.js['"]/);
    });
  });

  // ============================================================
  // REQUIREMENTS TRACEABILITY
  // ============================================================
  describe('Requirements Traceability', () => {
    
    it('should have explicit requirement labels for all 8 requirements', () => {
      for (let i = 1; i <= 8; i++) {
        expect(testFileContent).toContain(`Requirement ${i}`);
      }
    });

    it('should group tests in requirement describe blocks', () => {
      for (let i = 1; i <= 8; i++) {
        expect(testFileContent).toMatch(new RegExp(`describe\\s*\\(\\s*['"\`]Requirement ${i}`));
      }
    });
  });

  // ============================================================
  // MATHEMATICAL CORRECTNESS (ACTUAL COMPUTATION)
  // ============================================================
  describe('Mathematical Correctness Verification', () => {
    
    it('should correctly compute expected total for $100 + 10% tax + 15% tip', () => {
      const expected = 100 * (1 + 10/100) * (1 + 15/100);
      expect(Math.round(expected * 100)).toBe(12650);
      
      // Also verify the implementation matches
      const result = splitBill(100, 10, 15, 1);
      expect(result[0]).toBe(126.50);
    });

    it('should correctly verify all major test case expected values', () => {
      // $60 split 4 ways
      expect(splitBill(60, 0, 0, 4)).toEqual([15, 15, 15, 15]);
      
      // $10 split 3 ways
      const tenSplit = splitBill(10, 0, 0, 3);
      expect(tenSplit[0]).toBe(3.34);
      expect(tenSplit[1]).toBe(3.33);
      
      // $0.05 split 3 ways
      const nickelSplit = splitBill(0.05, 0, 0, 3);
      expect(nickelSplit[0]).toBe(0.03);
      expect(nickelSplit[1]).toBe(0.01);
    });
  });  // <-- THIS WAS MISSING

  // ============================================================
  // ANTI-PATTERN DETECTION
  // ============================================================
  describe('Anti-Pattern Detection', () => {
    
    it('should not have empty test bodies', () => {
      const emptyTests = testFileContent.match(/it\s*\([^)]+\)\s*{\s*}/g);
      expect(emptyTests).toBeNull();
    });

    it('should not use console.log in test assertions', () => {
      const cleanedContent = testFileContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');
      expect(cleanedContent).not.toMatch(/console\.log\s*\(/);
    });

    it('should not have hardcoded timeouts', () => {
      expect(testFileContent).not.toContain('setTimeout');
      expect(testFileContent).not.toContain('setInterval');
    });
  });
});