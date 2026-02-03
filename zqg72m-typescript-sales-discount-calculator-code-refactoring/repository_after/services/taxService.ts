import { TaxRate } from '../types';

/**
 * Service for retrieving tax rates.
 */
export class TaxService {
  constructor(private taxes: TaxRate[]) {}

  /**
   * Retrieves the tax rate for a given state.
   * Iterates through all tax rates to match, preserving original behavior for duplicates.
   * @param state The state to look up
   * @returns The tax rate, defaults to 0 if not found
   */
  getTaxRate(state: string | number): number {
    let rate = 0;
    for (const tax of this.taxes) {
      if (tax.state == state) {
        rate = tax.tax_rate;
      }
    }
    return rate;
  }
}