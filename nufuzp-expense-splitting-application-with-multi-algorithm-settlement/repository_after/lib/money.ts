/**
 * Money utility functions
 * All monetary values are stored and calculated as integers (cents).
 * User input is parsed via string splitting only (no parseFloat) to avoid
 * floating-point precision issues.
 */

/**
 * Convert dollars to cents.
 * Uses Math.round for internal/code use (e.g. percentage-derived values).
 * Prefer parseDollarsToCents for user input to avoid float entirely.
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars (for display only).
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
 * Parse dollar string to cents using integer-only logic (no parseFloat).
 * Handles "$10.50", "10.50", "10", "1,000.99". At most 2 decimal places;
 * extra decimals are truncated (e.g. "10.999" → 1099 cents).
 */
export function parseDollarsToCents(dollarString: string): number {
  const cleaned = dollarString.replace(/[$,\s]/g, '').trim()
  if (cleaned === '') {
    throw new Error('Invalid dollar amount')
  }

  const isNegative = cleaned.startsWith('-')
  const withoutSign = isNegative ? cleaned.slice(1).trim() : cleaned
  if (withoutSign === '') {
    throw new Error('Invalid dollar amount')
  }

  const parts = withoutSign.split('.')
  if (parts.length > 2) {
    throw new Error('Invalid dollar amount')
  }

  const dollarsPart = parts[0] === '' ? '0' : parts[0]
  if (parts[0] === '' && (parts.length < 2 || parts[1] === '')) {
    throw new Error('Invalid dollar amount')
  }
  if (!/^\d+$/.test(dollarsPart)) {
    throw new Error('Invalid dollar amount')
  }
  const dollars = parseInt(dollarsPart, 10)

  let centsFromDec = 0
  if (parts.length === 2) {
    if (!/^\d*$/.test(parts[1])) {
      throw new Error('Invalid dollar amount')
    }
    const decPart = parts[1].slice(0, 2).padEnd(2, '0')
    centsFromDec = parseInt(decPart, 10)
  }

  const totalCents = dollars * 100 + centsFromDec
  return isNegative ? -totalCents : totalCents
}

/**
 * Validate that a cents amount is a valid integer
 */
export function validateCents(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 0
}
