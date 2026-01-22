// Define interfaces for type safety
interface Transaction {
  order_id: string | number;
  customer_id: string | number;
  product_price: number;
  quantity: number;
  state: string | number;
}

interface Customer {
  customer_id: string | number;
  tier: string;
}

interface TaxRate {
  state: string | number;
  tax_rate: number;
}

interface ProcessedTransaction {
  order_id: string | number;
  customer_id: string | number;
  product_price: number;
  quantity: number;
  state: string | number;
  discount_rate: number;
  discount_amount: number;
  subtotal: number;
  tax_amount: number;
  final_price: number;
}

// Define constants for discount rates and thresholds
const DISCOUNT_RATES: Record<string, number> = {
  bronze: 0.05,
  silver: 0.10,
  gold: 0.15,
  platinum: 0.20,
};

const BULK_BONUS = 0.05;
const BULK_THRESHOLD = 10;

// Callback type for backward compatibility
type Callback = (err: Error | null, result: ProcessedTransaction[] | null) => void;

/**
 * Retrieves the customer tier for a given customer ID.
 * Iterates through all customers to match, preserving original behavior for duplicates.
 * @param customers Array of customer records
 * @param customerId The customer ID to look up
 * @returns The tier string, defaults to 'bronze' if not found
 */
function getCustomerTier(customers: Customer[], customerId: string | number): string {
  let tier = 'bronze';
  for (const customer of customers) {
    if (customer.customer_id == customerId) {
      tier = customer.tier;
    }
  }
  return tier;
}

/**
 * Calculates the discount rate based on tier and quantity.
 * @param tier The customer tier
 * @param quantity The quantity purchased
 * @returns The discount rate as a number
 */
function getDiscountRate(tier: string, quantity: number): number {
  const baseRate = DISCOUNT_RATES[tier] || DISCOUNT_RATES.bronze;
  return quantity >= BULK_THRESHOLD ? baseRate + BULK_BONUS : baseRate;
}

/**
 * Retrieves the tax rate for a given state.
 * Iterates through all tax rates to match, preserving original behavior for duplicates.
 * @param taxes Array of tax rate records
 * @param state The state to look up
 * @returns The tax rate, defaults to 0 if not found
 */
function getTaxRate(taxes: TaxRate[], state: string | number): number {
  let rate = 0;
  for (const tax of taxes) {
    if (tax.state == state) {
      rate = tax.tax_rate;
    }
  }
  return rate;
}

/**
 * Rounds a monetary value to 2 decimal places using the original rounding method.
 * @param value The value to round
 * @returns The rounded value
 */
function roundMonetary(value: number): number {
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
function calculatePrices(
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

/**
 * Processes all sales transactions asynchronously.
 * @param transactions Array of transaction records
 * @param customers Array of customer records
 * @param taxes Array of tax rate records
 * @returns Promise resolving to array of processed transactions
 */
async function processAllSalesAsync(
  transactions: Transaction[],
  customers: Customer[],
  taxes: TaxRate[]
): Promise<ProcessedTransaction[]> {
  const results: ProcessedTransaction[] = [];

  for (const t of transactions) {
    const tier = getCustomerTier(customers, t.customer_id);
    const discountRate = getDiscountRate(tier, t.quantity);
    const taxRate = getTaxRate(taxes, t.state);
    const prices = calculatePrices(t.product_price, t.quantity, discountRate, taxRate);

    const result: ProcessedTransaction = {
      order_id: t.order_id,
      customer_id: t.customer_id,
      product_price: t.product_price,
      quantity: t.quantity,
      state: t.state,
      discount_rate: roundMonetary(discountRate),
      discount_amount: prices.discountAmount,
      subtotal: prices.subtotal,
      tax_amount: prices.taxAmount,
      final_price: prices.finalPrice,
    };

    results.push(result);
  }

  return results;
}

/**
 * Processes all sales transactions using callback for backward compatibility.
 * @param transactions Array of transaction records
 * @param customers Array of customer records
 * @param taxes Array of tax rate records
 * @param callback Callback function to handle result or error
 */
function processAllSales(
  transactions: Transaction[],
  customers: Customer[],
  taxes: TaxRate[],
  callback: Callback
): void {
  processAllSalesAsync(transactions, customers, taxes)
    .then((results) => callback(null, results))
    .catch((err) => callback(err, null));
}

export { processAllSales, processAllSalesAsync, Transaction, Customer, TaxRate, ProcessedTransaction };