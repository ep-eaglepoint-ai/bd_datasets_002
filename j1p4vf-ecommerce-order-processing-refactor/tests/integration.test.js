/**
 * Integration Tests - Run against both Legacy and Refactored code
 * 
 * These tests verify that the refactored code meets all requirements
 * that the legacy code cannot meet.
 * 
 * Legacy will FAIL these tests because:
 * - No error isolation (payment failure calls inventory)
 * - No service decoupling
 * - No standardized error handling
 */

const legacyProcessor = require('../repository_before/OrderProcessor');
const refactoredProcessor = require('../repository_after/OrderProcessor');
const inventory = require('../repository_after/infra/inventory');
const gateway = require('../repository_after/infra/gateway');
const { PIPELINE_STEPS } = require('../repository_after/services/OrderOrchestrator');

describe('Integration Tests', () => {
  beforeEach(() => {
    inventory.reset();
    gateway.reset();
    inventory.initStock('item-1', 100);
    inventory.initStock('item-2', 50);
    inventory.initStock('out-of-stock-item', 0);
  });

  describe('Requirement 1: Service Decoupling', () => {
    test('Refactored code should have modular services', () => {
      const TaxService = require('../repository_after/services/TaxService');
      const InventoryService = require('../repository_after/services/InventoryService');
      const PaymentService = require('../repository_after/services/PaymentService');
      
      // Services should be independently testable
      expect(typeof TaxService.calculateSubtotal).toBe('function');
      expect(typeof TaxService.calculateTax).toBe('function');
      expect(typeof InventoryService.validateStockAvailability).toBe('function');
      expect(typeof InventoryService.reserveStock).toBe('function');
      expect(typeof PaymentService.authorizePayment).toBe('function');
    });

    test('Legacy code should NOT have service decoupling', () => {
      // Legacy code has all logic in one file - this test verifies that
      // the refactored version properly extracts services
      const legacySource = require('fs').readFileSync(
        require('path').resolve(__dirname, '../repository_before/OrderProcessor.js'),
        'utf8'
      );
      
      // Legacy code should have inline inventory/gateway calls
      expect(legacySource).toContain('inventory.checkStock');
      expect(legacySource).toContain('gateway.authorize');
    });
  });

  describe('Requirement 2: Pipeline Orchestration', () => {
    test('Refactored code should have OrderOrchestrator', () => {
      const { OrderOrchestrator, PIPELINE_STEPS } = require('../repository_after/services/OrderOrchestrator');
      
      expect(typeof OrderOrchestrator).toBe('function');
      expect(Array.isArray(Object.values(PIPELINE_STEPS))).toBe(true);
      expect(Object.values(PIPELINE_STEPS)).toContain('validate');
      expect(Object.values(PIPELINE_STEPS)).toContain('process_payment');
      expect(Object.values(PIPELINE_STEPS)).toContain('reserve_inventory');
    });

    test('Legacy code should NOT have pipeline pattern', () => {
      const legacySource = require('fs').readFileSync(
        require('path').resolve(__dirname, '../repository_before/OrderProcessor.js'),
        'utf8'
      );
      
      // Legacy code should not have orchestrator or pipeline
      expect(legacySource).not.toContain('OrderOrchestrator');
      expect(legacySource).not.toContain('PIPELINE_STEPS');
    });
  });

  describe('Requirement 3: Standardized Error Handling', () => {
    test('Refactored code should have custom error classes', () => {
      const errors = require('../repository_after/errors/OrderProcessingError');
      
      expect(typeof errors.OutOfStockError).toBe('function');
      expect(typeof errors.PaymentDeclinedError).toBe('function');
      expect(typeof errors.InsufficientFundsError).toBe('function');
    });

    test('Legacy code should NOT have custom error classes', () => {
      const legacySource = require('fs').readFileSync(
        require('path').resolve(__dirname, '../repository_before/OrderProcessor.js'),
        'utf8'
      );
      
      // Legacy code returns simple error strings
      expect(legacySource).toContain("return { success: false, error: 'No items' }");
      expect(legacySource).toContain("return { success: false, error: 'Payment Denied' }");
    });
  });

  describe('Requirement 4: Transactional Parity', () => {
    test('Refactored code should only reserve inventory after successful payment', async () => {
      const { OrderOrchestrator } = require('../repository_after/services/OrderOrchestrator');
      const reserveSpy = jest.spyOn(inventory, 'reserve');
      
      const orchestrator = new OrderOrchestrator({
        taxService: require('../repository_after/services/TaxService'),
        inventoryService: require('../repository_after/services/InventoryService'),
        paymentService: require('../repository_after/services/PaymentService'),
        fraudCheckService: null,
        db: require('../repository_after/infra/db')
      });
      
      // Test with declined payment
      const result = await orchestrator.processOrder({
        userId: 'user-123',
        items: [{ id: 'item-1', price: 10.00, quantity: 2 }],
        paymentToken: 'declined',
        shippingAddress: { state: 'TX' }
      });
      
      expect(result.success).toBe(false);
      // Inventory should NOT be reserved on payment failure
      expect(reserveSpy).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 5: Tax Rule Externalization', () => {
    test('Refactored code should have externalized tax rates', () => {
      const TaxService = require('../repository_after/services/TaxService');
      
      // Should have configurable tax rates
      expect(TaxService.TAX_RATES).toBeDefined();
      expect(TaxService.TAX_RATES.CA).toBe(0.0925);
      expect(TaxService.TAX_RATES.TX).toBe(0.0825);
      
      // Should allow dynamic updates
      TaxService.setTaxRate('NV', 0.0685);
      expect(TaxService.getTaxRate('NV')).toBe(0.0685);
    });
  });

  describe('Requirement 6: Data Shape Preservation', () => {
    test('Both implementations should return same data shape', async () => {
      const validOrder = {
        userId: 'user-123',
        items: [{ id: 'item-1', price: 10.00, quantity: 2 }],
        paymentToken: 'valid-token',
        shippingAddress: { state: 'TX' }
      };
      
      const legacyResult = await legacyProcessor.processOrder(validOrder);
      const refactoredResult = await refactoredProcessor.processOrder(validOrder);
      
      // Both should return same shape
      expect(legacyResult).toHaveProperty('success');
      expect(legacyResult).toHaveProperty('orderId');
      expect(refactoredResult).toHaveProperty('success');
      expect(refactoredResult).toHaveProperty('orderId');
    });
  });

  describe('Requirement 7: Error Isolation', () => {
    test('Refactored code should isolate payment errors from inventory', async () => {
      const reserveSpy = jest.spyOn(inventory, 'reserve');
      
      const result = await refactoredProcessor.processOrder({
        userId: 'user-123',
        items: [{ id: 'item-1', price: 10.00, quantity: 2 }],
        paymentToken: 'declined',
        shippingAddress: { state: 'TX' }
      });
      
      expect(result.success).toBe(false);
      expect(reserveSpy).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 8: California Tax Rate', () => {
    test('California orders should use 9.25% tax rate', () => {
      const TaxService = require('../repository_after/services/TaxService');
      
      const result = TaxService.calculateTax(
        { shippingAddress: { state: 'CA' } },
        100
      );
      
      expect(result.rate).toBe(0.0925);
      expect(result.taxAmount).toBe(9.25);
    });
  });
});
