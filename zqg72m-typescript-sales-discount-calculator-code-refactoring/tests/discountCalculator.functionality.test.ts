import * as fs from 'fs';
import * as path from 'path';

const repo = process.env.REPO || 'after';
const modulePath = path.join(__dirname, '..', `repository_${repo}`, 'discountCalculator');

describe('Sales Discount Calculator - Functionality', () => {
  let processAllSales: any;
  let processAllSalesAsync: any;

  beforeAll(() => {
    const module = require(modulePath);
    processAllSales = module.processAllSales;
    processAllSalesAsync = module.processAllSalesAsync;
  });

  it('should process transactions correctly', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 2, state: 'CA' },
      { order_id: 2, customer_id: 2, product_price: 50, quantity: 15, state: 'NY' },
    ];
    const customers = [
      { customer_id: 1, tier: 'gold' },
      { customer_id: 2, tier: 'silver' },
    ];
    const taxes = [
      { state: 'CA', tax_rate: 0.08 },
      { state: 'NY', tax_rate: 0.06 },
    ];

    const expected = [
      {
        order_id: 1,
        customer_id: 1,
        product_price: 100,
        quantity: 2,
        state: 'CA',
        discount_rate: 0.15,
        discount_amount: 30.00,
        subtotal: 170.00,
        tax_amount: 13.60,
        final_price: 183.60,
      },
      {
        order_id: 2,
        customer_id: 2,
        product_price: 50,
        quantity: 15,
        state: 'NY',
        discount_rate: 0.15,
        discount_amount: 112.50,
        subtotal: 637.50,
        tax_amount: 38.25,
        final_price: 675.75,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should have async version', async () => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 1, state: 'CA' },
    ];
    const customers = [{ customer_id: 1, tier: 'bronze' }];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    const result = await processAllSalesAsync(transactions, customers, taxes);
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
  });

  it('should default to bronze tier for missing customer_id', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 999, product_price: 100, quantity: 1, state: 'CA' },
    ];
    const customers = [{ customer_id: 1, tier: 'gold' }];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    const expected = [
      {
        order_id: 1,
        customer_id: 999,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.05,
        discount_amount: 5.00,
        subtotal: 95.00,
        tax_amount: 7.60,
        final_price: 102.60,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should default to 0 tax rate for missing state', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 1, state: 'XX' },
    ];
    const customers = [{ customer_id: 1, tier: 'gold' }];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    const expected = [
      {
        order_id: 1,
        customer_id: 1,
        product_price: 100,
        quantity: 1,
        state: 'XX',
        discount_rate: 0.15,
        discount_amount: 15.00,
        subtotal: 85.00,
        tax_amount: 0.00,
        final_price: 85.00,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should handle duplicate customers (last match wins)', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 1, state: 'CA' },
    ];
    const customers = [
      { customer_id: 1, tier: 'bronze' },
      { customer_id: 1, tier: 'platinum' },
    ];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    const expected = [
      {
        order_id: 1,
        customer_id: 1,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.20,
        discount_amount: 20.00,
        subtotal: 80.00,
        tax_amount: 6.40,
        final_price: 86.40,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should handle duplicate taxes (last match wins)', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 1, state: 'CA' },
    ];
    const customers = [{ customer_id: 1, tier: 'gold' }];
    const taxes = [
      { state: 'CA', tax_rate: 0.05 },
      { state: 'CA', tax_rate: 0.10 },
    ];

    const expected = [
      {
        order_id: 1,
        customer_id: 1,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.15,
        discount_amount: 15.00,
        subtotal: 85.00,
        tax_amount: 8.50,
        final_price: 93.50,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should handle mixed string/number types', (done) => {
    const transactions = [
      { order_id: '1', customer_id: '1', product_price: 100, quantity: 1, state: 123 },
    ];
    const customers = [{ customer_id: 1, tier: 'gold' }];
    const taxes = [{ state: '123', tax_rate: 0.08 }];

    const expected = [
      {
        order_id: '1',
        customer_id: '1',
        product_price: 100,
        quantity: 1,
        state: 123,
        discount_rate: 0.15,
        discount_amount: 15.00,
        subtotal: 85.00,
        tax_amount: 6.80,
        final_price: 91.80,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should handle all discount tiers including platinum', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 1, state: 'CA' },
      { order_id: 2, customer_id: 2, product_price: 100, quantity: 1, state: 'CA' },
      { order_id: 3, customer_id: 3, product_price: 100, quantity: 1, state: 'CA' },
      { order_id: 4, customer_id: 4, product_price: 100, quantity: 1, state: 'CA' },
    ];
    const customers = [
      { customer_id: 1, tier: 'bronze' },
      { customer_id: 2, tier: 'silver' },
      { customer_id: 3, tier: 'gold' },
      { customer_id: 4, tier: 'platinum' },
    ];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    const expected = [
      {
        order_id: 1,
        customer_id: 1,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.05,
        discount_amount: 5.00,
        subtotal: 95.00,
        tax_amount: 7.60,
        final_price: 102.60,
      },
      {
        order_id: 2,
        customer_id: 2,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.10,
        discount_amount: 10.00,
        subtotal: 90.00,
        tax_amount: 7.20,
        final_price: 97.20,
      },
      {
        order_id: 3,
        customer_id: 3,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.15,
        discount_amount: 15.00,
        subtotal: 85.00,
        tax_amount: 6.80,
        final_price: 91.80,
      },
      {
        order_id: 4,
        customer_id: 4,
        product_price: 100,
        quantity: 1,
        state: 'CA',
        discount_rate: 0.20,
        discount_amount: 20.00,
        subtotal: 80.00,
        tax_amount: 6.40,
        final_price: 86.40,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should handle quantity exactly 10 (bulk threshold)', (done) => {
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 100, quantity: 10, state: 'CA' },
    ];
    const customers = [{ customer_id: 1, tier: 'gold' }];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    const expected = [
      {
        order_id: 1,
        customer_id: 1,
        product_price: 100,
        quantity: 10,
        state: 'CA',
        discount_rate: 0.20,
        discount_amount: 200.00,
        subtotal: 800.00,
        tax_amount: 64.00,
        final_price: 864.00,
      },
    ];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual(expected);
      done();
    });
  });

  it('should handle empty arrays', (done) => {
    const transactions: any[] = [];
    const customers: any[] = [];
    const taxes: any[] = [];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      expect(err).toBeNull();
      expect(result).toEqual([]);
      done();
    });
  });

  it('should handle error in callback', (done) => {
    // Test with invalid data that might cause error
    const transactions = [
      { order_id: 1, customer_id: 1, product_price: 'invalid', quantity: 1, state: 'CA' },
    ];
    const customers = [{ customer_id: 1, tier: 'gold' }];
    const taxes = [{ state: 'CA', tax_rate: 0.08 }];

    processAllSales(transactions, customers, taxes, (err: any, result: any) => {
      // Since we have type safety now, this should not error, but test error handling
      expect(err).toBeNull();
      expect(result).toBeDefined();
      done();
    });
  });
});