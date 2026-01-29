
// filename: BillSplitter.js
/**
 * Splits a total bill amount among a group of people.
 * logic: Calculate total with tax/tip, divide, and floor values to the nearest cent.
 */
export function splitBill(total, taxPercent, tipPercent, numPeople) {
  if (numPeople <= 0) return [];

  const totalWithTax = total * (1 + taxPercent / 100);
  const finalAmount = totalWithTax * (1 + tipPercent / 100);

  // Convert to cents to handle rounding more predictably
  const totalCents = Math.round(finalAmount * 100);
  const perPersonCents = Math.floor(totalCents / numPeople);
  const remainderCents = totalCents % numPeople;

  const results = new Array(numPeople).fill(perPersonCents);

  // Add remainder cents to the first person (Lead Payer)
  results[0] += remainderCents;

  // Map back to dollars
  return results.map(cents => cents / 100);
}