/**
 * Money utility functions
 * All monetary values are stored and calculated as integers (cents)
 * No floating-point arithmetic is allowed
 */

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/**
 * Format cents as currency string (e.g., "$10.50")
 */
export function formatCents(cents: number): string {
  const dollars = centsToDollars(cents)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

/**
 * Format cents as number string with 2 decimal places (e.g., "10.50")
 */
export function formatCentsAsNumber(cents: number): string {
  const dollars = centsToDollars(cents)
  return dollars.toFixed(2)
}

/**
 * Parse dollar string to cents
 * Handles "$10.50", "10.50", "10" formats
 */
export function parseDollarsToCents(dollarString: string): number {
  // Remove currency symbols and whitespace
  const cleaned = dollarString.replace(/[$,\s]/g, '')
  const dollars = parseFloat(cleaned)
  if (isNaN(dollars)) {
    throw new Error('Invalid dollar amount')
  }
  return dollarsToCents(dollars)
}

/**
 * Validate that a cents amount is a valid integer
 */
export function validateCents(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 0
}
