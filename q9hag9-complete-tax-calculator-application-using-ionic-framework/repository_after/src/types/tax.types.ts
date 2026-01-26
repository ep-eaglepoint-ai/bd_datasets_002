export type TaxMode = 'flat' | 'progressive';

export interface TaxBracket {
    min: number;
    max: number | null;
    rate: number;
}

export interface TaxCalculationResult {
    taxableIncome: number;
    totalTax: number;
    netIncome: number;
    effectiveRate: number;
}

export interface TaxInputs {
    annualIncome: number;
    totalDeductions: number;
    taxMode: TaxMode;
    flatTaxRate?: number;
}
