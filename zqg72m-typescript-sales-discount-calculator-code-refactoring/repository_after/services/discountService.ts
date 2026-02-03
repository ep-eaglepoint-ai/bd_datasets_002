import { DISCOUNT_RATES, BULK_BONUS, BULK_THRESHOLD } from '../utils';

/**
 * Service for calculating discount rates.
 */
export class DiscountService {
  /**
   * Calculates the discount rate based on tier and quantity.
   * @param tier The customer tier
   * @param quantity The quantity purchased
   * @returns The discount rate as a number
   */
  getDiscountRate(tier: string, quantity: number): number {
    const baseRate = DISCOUNT_RATES[tier] || DISCOUNT_RATES.bronze;
    return quantity >= BULK_THRESHOLD ? baseRate + BULK_BONUS : baseRate;
  }
}