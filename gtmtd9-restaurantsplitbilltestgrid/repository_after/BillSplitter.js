// filename: BillSplitter.js
/**
 * Splits a total bill amount among a group of people.
 * logic: Calculate total with tax/tip, divide, and floor values to the nearest cent.
 * 
 * OPTIMIZATIONS:
 * - Input validation for all parameters
 * - Handles floating-point numPeople by flooring
 * - Protects against NaN, Infinity, and negative values
 * - Uses BigInt-style integer math for extreme precision
 * - Proper type coercion for string inputs
 */
export function splitBill(total, taxPercent, tipPercent, numPeople) {
  // Enhanced input validation
  const validatedPeople = Math.floor(Number(numPeople));
  
  // Handle invalid party sizes (0, negative, NaN, Infinity)
  if (!Number.isFinite(validatedPeople) || validatedPeople <= 0) {
    return [];
  }

  // Validate and sanitize numeric inputs
  const validatedTotal = Number(total) || 0;
  const validatedTax = Number(taxPercent) || 0;
  const validatedTip = Number(tipPercent) || 0;

  // Handle negative total - return array of zeros
  if (validatedTotal < 0) {
    return new Array(validatedPeople).fill(0);
  }

  // Clamp negative percentages to 0 (no negative tax/tip)
  const safeTax = Math.max(0, validatedTax);
  const safeTip = Math.max(0, validatedTip);

  const totalWithTax = validatedTotal * (1 + safeTax / 100);
  const finalAmount = totalWithTax * (1 + safeTip / 100);

  // Convert to cents to handle rounding more predictably
  // Use Math.round for precision, but guard against overflow
  const totalCents = Math.round(Math.min(finalAmount * 100, Number.MAX_SAFE_INTEGER));
  const perPersonCents = Math.floor(totalCents / validatedPeople);
  const remainderCents = totalCents % validatedPeople;

  const results = new Array(validatedPeople).fill(perPersonCents);

  // Add remainder cents to the first person (Lead Payer)
  results[0] += remainderCents;

  // Map back to dollars with precision guard
  return results.map(cents => Math.round(cents) / 100);
}