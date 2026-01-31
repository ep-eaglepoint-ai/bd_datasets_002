/**
 * Refactored OrderProcessor Tests
 * Tests for the modular, service-oriented architecture
 */

const refactoredProcessor = require('../repository_after/OrderProcessor');
const TaxService = require('../repository_after/services/TaxService');
const InventoryService = require('../repository_after/services/InventoryService');
const PaymentService = require('../repository_after/services/PaymentService');
const inventory = require('../repository_after/infra/inventory');
const gateway = require('../repository_after/infra/gateway');

describe('Refactored OrderProcessor', () => {
  beforeEach(() => {
    inventory.reset();
    gateway.reset();
    inventory.initStock('item-1', 100);
    inventory.initStock('item-2', 50);
    inventory.initStock('out-of-stock-item', 0);
  });

  describe('processOrder', () => {
    const validOrderData = {
      userId: 'user-123',
      items: [
        { id: 'item-1', price: 10.00, quantity: 2 },
        { id: 'item-2', price: 25.00, quantity: 1 }
      ],
      paymentToken: 'valid-token',
      shippingAddress: { state: 'TX' }
    };

    test('should process a valid order successfully', async () => {
      const result = await refactoredProcessor.processOrder(validOrderData);
      expect(result.success).toBe(true);
      expect(result.orderId).toMatch(/^ORD-\d+$/);
    });

    test('should return same data shape as legacy processor', async () => {
      const result = await refactoredProcessor.processOrder(validOrderData);
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('orderId');
        expect(result).not.toHaveProperty('error');
      }
    });

    test('should fail when order has no items', async () => {
      const result = await refactoredProcessor.processOrder({ ...validOrderData, items: [] });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should fail when item is out of stock', async () => {
      const result = await refactoredProcessor.processOrder({
        ...validOrderData,
        items: [{ id: 'out-of-stock-item', price: 10.00, quantity: 1 }]
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should fail when payment is declined', async () => {
      const result = await refactoredProcessor.processOrder({
        ...validOrderData,
        paymentToken: 'declined'
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Service Decoupling', () => {
    test('TaxService should be independently testable', () => {
      expect(typeof TaxService.calculateSubtotal).toBe('function');
      expect(typeof TaxService.calculateTax).toBe('function');
    });

    test('InventoryService should be independently testable', async () => {
      expect(typeof InventoryService.validateStockAvailability).toBe('function');
      expect(typeof InventoryService.reserveStock).toBe('function');
      const result = await InventoryService.validateStockAvailability([{ id: 'item-1', quantity: 5 }]);
      expect(result.available).toBe(true);
    });

    test('PaymentService should be independently testable', async () => {
      expect(typeof PaymentService.authorizePayment).toBe('function');
      const result = await PaymentService.authorizePayment('valid-token', 100);
      expect(result.success).toBe(true);
      expect(result.status).toBe('AUTHORIZED');
    });
  });

  describe('Error Handling', () => {
    test('should have specific error classes', () => {
      const { OutOfStockError, PaymentDeclinedError, InsufficientFundsError } = require('../repository_after/errors/OrderProcessingError');
      expect(typeof OutOfStockError).toBe('function');
      expect(typeof PaymentDeclinedError).toBe('function');
      expect(typeof InsufficientFundsError).toBe('function');
    });
  });
});
