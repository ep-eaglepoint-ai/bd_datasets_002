import { Customer } from '../types';

/**
 * Service for retrieving customer information.
 */
export class CustomerService {
  constructor(private customers: Customer[]) {}

  /**
   * Retrieves the customer tier for a given customer ID.
   * Iterates through all customers to match, preserving original behavior for duplicates.
   * @param customerId The customer ID to look up
   * @returns The tier string, defaults to 'bronze' if not found
   */
  getCustomerTier(customerId: string | number): string {
    let tier = 'bronze';
    for (const customer of this.customers) {
      if (customer.customer_id == customerId) {
        tier = customer.tier;
      }
    }
    return tier;
  }
}