import { Transaction, ProcessedTransaction } from '../types';
import { calculatePrices, roundMonetary } from '../utils';
import { DiscountService } from './discountService';
import { TaxService } from './taxService';
import { CustomerService } from './customerService';

/**
 * Service for processing sales transactions.
 */
export class SalesProcessor {
  constructor(
    private discountService: DiscountService,
    private taxService: TaxService,
    private customerService: CustomerService
  ) {}

  /**
   * Processes all sales transactions asynchronously.
   * @param transactions Array of transaction records
   * @returns Promise resolving to array of processed transactions
   */
  async processAllSales(transactions: Transaction[]): Promise<ProcessedTransaction[]> {
    const results: ProcessedTransaction[] = [];

    for (const t of transactions) {
      const tier = this.customerService.getCustomerTier(t.customer_id);
      const discountRate = this.discountService.getDiscountRate(tier, t.quantity);
      const taxRate = this.taxService.getTaxRate(t.state);
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
}