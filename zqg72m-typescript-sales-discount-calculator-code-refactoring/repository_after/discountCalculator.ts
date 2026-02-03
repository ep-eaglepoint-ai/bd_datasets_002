import { Transaction, Customer, TaxRate, ProcessedTransaction, Callback } from './types';
import { DiscountService, TaxService, CustomerService, SalesProcessor } from './services';

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
  const discountService = new DiscountService();
  const taxService = new TaxService(taxes);
  const customerService = new CustomerService(customers);
  const salesProcessor = new SalesProcessor(discountService, taxService, customerService);

  return salesProcessor.processAllSales(transactions);
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