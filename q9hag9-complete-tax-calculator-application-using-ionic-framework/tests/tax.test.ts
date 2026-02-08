/**
 * Unit tests for tax calculation business logic
 * Tests requirements: 5, 6, 7, 8, 9, 10, 14
 */

import {
    calculateTaxableIncome,
    calculateFlatTax,
    calculateProgressiveTax,
    calculateNetIncome,
    calculateEffectiveRate,
    calculateTaxResults,
    DEFAULT_TAX_BRACKETS
} from '../repository_after/src/utils/taxCalculations';

describe('Tax Calculation Utilities (Requirement 14: Separated Business Logic)', () => {
    describe('calculateTaxableIncome (Requirement 7)', () => {
        test('should calculate taxable income correctly', () => {
            expect(calculateTaxableIncome(50000, 12000)).toBe(38000);
            expect(calculateTaxableIncome(100000, 20000)).toBe(80000);
        });

        test('should not return negative taxable income', () => {
            expect(calculateTaxableIncome(10000, 15000)).toBe(0);
        });

        test('should handle zero income', () => {
            expect(calculateTaxableIncome(0, 0)).toBe(0);
        });
    });

    describe('calculateFlatTax (Requirement 5: Flat Tax Rate)', () => {
        test('should calculate flat tax correctly', () => {
            expect(calculateFlatTax(50000, 15)).toBe(7500);
            expect(calculateFlatTax(100000, 20)).toBe(20000);
        });

        test('should handle zero rate', () => {
            expect(calculateFlatTax(50000, 0)).toBe(0);
        });

        test('should handle zero income', () => {
            expect(calculateFlatTax(0, 15)).toBe(0);
        });
    });

    describe('calculateProgressiveTax (Requirement 6: Progressive Tax Brackets)', () => {
        test('should calculate progressive tax for income in first bracket', () => {
            const tax = calculateProgressiveTax(5000, DEFAULT_TAX_BRACKETS);
            expect(tax).toBe(500); // 5000 * 0.10
        });

        test('should calculate progressive tax for income spanning multiple brackets', () => {
            // Income of 50,000
            // 10,000 * 0.10 = 1,000
            // 30,000 * 0.12 = 3,600
            // 10,000 * 0.22 = 2,200
            // Total = 6,800
            const tax = calculateProgressiveTax(50000, DEFAULT_TAX_BRACKETS);
            expect(tax).toBeCloseTo(6800, 0); // Within 1 dollar
        });

        test('should calculate progressive tax for high income', () => {
            const tax = calculateProgressiveTax(200000, DEFAULT_TAX_BRACKETS);
            expect(tax).toBeGreaterThan(0);
            expect(tax).toBeLessThan(200000);
        });

        test('should handle zero income', () => {
            expect(calculateProgressiveTax(0, DEFAULT_TAX_BRACKETS)).toBe(0);
        });

        test('should use configurable brackets', () => {
            const customBrackets = [
                { min: 0, max: 20000, rate: 0.05 },
                { min: 20001, max: null, rate: 0.10 }
            ];
            const tax = calculateProgressiveTax(30000, customBrackets);
            expect(tax).toBeCloseTo(2000, 0); // 20000 * 0.05 + 10000 * 0.10
        });
    });

    describe('calculateNetIncome (Requirement 9: Net Income After Tax)', () => {
        test('should calculate net income correctly', () => {
            expect(calculateNetIncome(50000, 7500)).toBe(42500);
            expect(calculateNetIncome(100000, 20000)).toBe(80000);
        });

        test('should handle zero tax', () => {
            expect(calculateNetIncome(50000, 0)).toBe(50000);
        });
    });

    describe('calculateEffectiveRate (Requirement 10: Effective Tax Rate)', () => {
        test('should calculate effective rate correctly', () => {
            expect(calculateEffectiveRate(7500, 50000)).toBe(15);
            expect(calculateEffectiveRate(20000, 100000)).toBe(20);
        });

        test('should handle zero income', () => {
            expect(calculateEffectiveRate(0, 0)).toBe(0);
        });

        test('should calculate fractional rates', () => {
            const rate = calculateEffectiveRate(12345, 100000);
            expect(rate).toBeCloseTo(12.345, 3);
        });
    });

    describe('calculateTaxResults (Requirements 7, 8, 9, 10)', () => {
        test('should calculate all results for flat tax mode', () => {
            const results = calculateTaxResults(50000, 12000, 'flat', 15);

            expect(results.taxableIncome).toBe(38000); // Req 7
            expect(results.totalTax).toBe(5700);        // Req 8
            expect(results.netIncome).toBe(44300);      // Req 9
            expect(results.effectiveRate).toBeCloseTo(11.4, 1); // Req 10
        });

        test('should calculate all results for progressive tax mode', () => {
            const results = calculateTaxResults(50000, 12000, 'progressive');

            expect(results.taxableIncome).toBe(38000); // Req 7
            expect(results.totalTax).toBeGreaterThan(0); // Req 8
            expect(results.netIncome).toBeLessThan(50000); // Req 9
            expect(results.effectiveRate).toBeGreaterThan(0); // Req 10
        });

        test('should handle edge cases', () => {
            const results = calculateTaxResults(0, 0, 'flat', 10);

            expect(results.taxableIncome).toBe(0);
            expect(results.totalTax).toBe(0);
            expect(results.netIncome).toBe(0);
            expect(results.effectiveRate).toBe(0);
        });
    });
});
