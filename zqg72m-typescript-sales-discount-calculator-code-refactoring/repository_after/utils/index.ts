// Define constants for discount rates and thresholds
export const DISCOUNT_RATES: Record<string, number> = {
  bronze: 0.05,
  silver: 0.10,
  gold: 0.15,
  platinum: 0.20,
};

export const BULK_BONUS = 0.05;
export const BULK_THRESHOLD = 10;

/**
 * Rounds a monetary value to 2 decimal places using the original rounding method.
 * @param value The value to round
 * @returns The rounded value
 */
export function roundMonetary(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates discount amount, subtotal, tax amount, and final price.
 * @param productPrice The price per product
 * @param quantity The quantity
 * @param discountRate The discount rate
 * @param taxRate The tax rate
 * @returns An object with calculated and rounded monetary values
 */
export function calculatePrices(
  productPrice: number,
  quantity: number,
  discountRate: number,
  taxRate: number
): { discountAmount: number; subtotal: number; taxAmount: number; finalPrice: number } {
  const basePrice = productPrice * quantity;
  const discountAmount = basePrice * discountRate;
  const subtotal = basePrice - discountAmount;
  const taxAmount = subtotal * taxRate;
  const finalPrice = subtotal + taxAmount;

  return {
    discountAmount: roundMonetary(discountAmount),
    subtotal: roundMonetary(subtotal),
    taxAmount: roundMonetary(taxAmount),
    finalPrice: roundMonetary(finalPrice),
  };
}