/**
 * Base error class for order processing errors
 */
class OrderProcessingError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'OrderProcessingError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class InvalidOrderError extends OrderProcessingError {
  constructor(message = 'Invalid order data', details = {}) {
    super(message, 'INVALID_ORDER', details);
    this.name = 'InvalidOrderError';
  }
}

class OutOfStockError extends OrderProcessingError {
  constructor(itemId, requestedQuantity, availableQuantity) {
    super(
      `Item ${itemId} is out of stock`,
      'OUT_OF_STOCK',
      { itemId, requestedQuantity, availableQuantity }
    );
    this.name = 'OutOfStockError';
  }
}

class PaymentDeclinedError extends OrderProcessingError {
  constructor(reason, details = {}) {
    super(`Payment declined: ${reason}`, 'PAYMENT_FAILED', details);
    this.name = 'PaymentDeclinedError';
  }
}

class InsufficientFundsError extends PaymentDeclinedError {
  constructor(availableAmount, requestedAmount) {
    super('Insufficient funds available', {
      errorType: 'INSUFFICIENT_FUNDS',
      availableAmount,
      requestedAmount
    });
    this.name = 'InsufficientFundsError';
  }
}

class TaxCalculationError extends OrderProcessingError {
  constructor(message = 'Tax calculation failed', details = {}) {
    super(message, 'TAX_CALCULATION_ERROR', details);
    this.name = 'TaxCalculationError';
  }
}

class InventoryReservationError extends OrderProcessingError {
  constructor(itemId, quantity, reason) {
    super(
      `Failed to reserve inventory for item ${itemId}`,
      'INVENTORY_RESERVATION_FAILED',
      { itemId, quantity, reason }
    );
    this.name = 'InventoryReservationError';
  }
}

class FraudCheckFailedError extends OrderProcessingError {
  constructor(reason, details = {}) {
    super(`Fraud check failed: ${reason}`, 'FRAUD_CHECK_FAILED', details);
    this.name = 'FraudCheckFailedError';
  }
}

class DatabaseError extends OrderProcessingError {
  constructor(message = 'Database operation failed', details = {}) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

module.exports = {
  OrderProcessingError,
  InvalidOrderError,
  OutOfStockError,
  PaymentDeclinedError,
  InsufficientFundsError,
  TaxCalculationError,
  InventoryReservationError,
  FraudCheckFailedError,
  DatabaseError
};
