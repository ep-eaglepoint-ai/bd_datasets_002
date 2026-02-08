import { TaxBracket, TaxCalculationResult } from '../types/tax.types';

// Default progressive tax brackets (similar to US federal tax structure)
export const DEFAULT_TAX_BRACKETS: TaxBracket[] = [
    { min: 0, max: 10000, rate: 0.10 },
    { min: 10001, max: 40000, rate: 0.12 },
    { min: 40001, max: 85000, rate: 0.22 },
    { min: 85001, max: 160000, rate: 0.24 },
    { min: 160001, max: 200000, rate: 0.32 },
    { min: 200001, max: 500000, rate: 0.35 },
    { min: 500001, max: null, rate: 0.37 }
];

/**
 * Calculate taxable income by subtracting deductions from annual income
 */
export function calculateTaxableIncome(
    annualIncome: number,
    deductions: number
): number {
    const taxableIncome = annualIncome - deductions;
    return Math.max(0, taxableIncome); // Cannot be negative
}

/**
 * Calculate tax using a flat tax rate
 */
export function calculateFlatTax(
    taxableIncome: number,
    rate: number
): number {
    return taxableIncome * (rate / 100);
}

/**
 * Calculate tax using progressive tax brackets
 */
export function calculateProgressiveTax(
    taxableIncome: number,
    brackets: TaxBracket[] = DEFAULT_TAX_BRACKETS
): number {
    let totalTax = 0;

    for (const bracket of brackets) {
        if (taxableIncome <= bracket.min) break;

        const bracketMax = bracket.max ?? Infinity;
        const incomeInBracket = Math.min(
            taxableIncome - bracket.min,
            bracketMax - bracket.min
        );

        if (incomeInBracket > 0) {
            totalTax += incomeInBracket * bracket.rate;
        }
    }

    return totalTax;
}

/**
 * Calculate net income after tax
 */
export function calculateNetIncome(
    annualIncome: number,
    totalTax: number
): number {
    return annualIncome - totalTax;
}

/**
 * Calculate effective tax rate as a percentage
 */
export function calculateEffectiveRate(
    totalTax: number,
    annualIncome: number
): number {
    if (annualIncome === 0) return 0;
    return (totalTax / annualIncome) * 100;
}

/**
 * Main calculation function that returns all tax calculation results
 */
export function calculateTaxResults(
    annualIncome: number,
    deductions: number,
    taxMode: 'flat' | 'progressive',
    flatTaxRate?: number,
    brackets?: TaxBracket[]
): TaxCalculationResult {
    const taxableIncome = calculateTaxableIncome(annualIncome, deductions);

    const totalTax = taxMode === 'flat'
        ? calculateFlatTax(taxableIncome, flatTaxRate || 0)
        : calculateProgressiveTax(taxableIncome, brackets);

    const netIncome = calculateNetIncome(annualIncome, totalTax);
    const effectiveRate = calculateEffectiveRate(totalTax, annualIncome);

    return {
        taxableIncome,
        totalTax,
        netIncome,
        effectiveRate
    };
}
