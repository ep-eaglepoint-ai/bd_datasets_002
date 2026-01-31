/**
 * Tax Calculation Tests
 * Requirement 8: Verify California orders use 9.25% rate derived from legacy logic
 */

const TaxService = require('../repository_after/services/TaxService');

describe('Tax Calculation Tests', () => {
  test('Requirement 8: California order should use 9.25% tax rate', () => {
    // This test verifies the tax rate matches legacy behavior
    const orderData = {
      shippingAddress: { state: 'CA' }
    };
    const subtotal = 100.00;

    const result = TaxService.calculateTax(orderData, subtotal);

    expect(result.rate).toBe(0.0925); // 9.25% for California
    expect(result.taxAmount).toBe(9.25); // $9.25 on $100
    expect(result.state).toBe('CA');
  });

  test('Texas order should use 8.25% tax rate', () => {
    const orderData = {
      shippingAddress: { state: 'TX' }
    };
    const subtotal = 100.00;

    const result = TaxService.calculateTax(orderData, subtotal);

    expect(result.rate).toBe(0.0825); // 8.25% for Texas
    expect(result.taxAmount).toBe(8.25);
    expect(result.state).toBe('TX');
  });

  test('Unknown state should use default 8.25% rate', () => {
    const orderData = {
      shippingAddress: { state: 'UNKNOWN' }
    };
    const subtotal = 100.00;

    const result = TaxService.calculateTax(orderData, subtotal);

    expect(result.rate).toBe(0.0825); // Default rate
    expect(result.state).toBe('DEFAULT');
  });

  test('No state provided should use default rate', () => {
    const orderData = {
      shippingAddress: {}
    };
    const subtotal = 100.00;

    const result = TaxService.calculateTax(orderData, subtotal);

    expect(result.rate).toBe(0.0825);
  });

  test('Should calculate correct total for California order', () => {
    const orderData = {
      shippingAddress: { state: 'CA' }
    };
    const items = [
      { id: 'item-1', price: 10.00, quantity: 2 },
      { id: 'item-2', price: 25.00, quantity: 1 }
    ];

    const subtotal = TaxService.calculateSubtotal(items);
    const taxResult = TaxService.calculateTax(orderData, subtotal);
    const total = subtotal + taxResult.taxAmount;

    // Subtotal: (10 * 2) + (25 * 1) = 45
    expect(subtotal).toBe(45);
    // Tax: 45 * 0.0925 = 4.1625
    expect(taxResult.taxAmount).toBe(4.1625);
    // Total: 45 + 4.1625 = 49.1625
    expect(total).toBe(49.1625);
  });

  test('Should calculate correct total for Texas order', () => {
    const orderData = {
      shippingAddress: { state: 'TX' }
    };
    const items = [
      { id: 'item-1', price: 10.00, quantity: 2 },
      { id: 'item-2', price: 25.00, quantity: 1 }
    ];

    const subtotal = TaxService.calculateSubtotal(items);
    const taxResult = TaxService.calculateTax(orderData, subtotal);
    const total = subtotal + taxResult.taxAmount;

    // Subtotal: 45
    expect(subtotal).toBe(45);
    // Tax: 45 * 0.0825 = 3.7125
    expect(taxResult.taxAmount).toBe(3.7125);
    // Total: 45 + 3.7125 = 48.7125
    expect(total).toBe(48.7125);
  });

  test('Should support dynamic tax rate configuration', () => {
    // Requirement 5: Allow for regional scaling
    TaxService.setTaxRate('NV', 0.0685);

    const orderData = {
      shippingAddress: { state: 'NV' }
    };
    const subtotal = 100.00;

    const result = TaxService.calculateTax(orderData, subtotal);

    expect(result.rate).toBe(0.0685);
  });
});
