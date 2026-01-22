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
});