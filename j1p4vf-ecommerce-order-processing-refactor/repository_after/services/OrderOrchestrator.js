/**
 * OrderOrchestrator - Coordinates the order processing pipeline
 * Requirement 2: Pipeline Orchestration - Structured pipeline with chain pattern
 */

const db = require('../infra/db');
const TaxService = require('./TaxService');
const InventoryService = require('./InventoryService');
const PaymentService = require('./PaymentService');
const FraudCheckService = require('./FraudCheckService');
const { InvalidOrderError, PaymentDeclinedError, DatabaseError } = require('../errors/OrderProcessingError');

const PIPELINE_STEPS = {
  VALIDATE: 'validate',
  FRAUD_CHECK: 'fraud_check',
  CALCULATE_TAX: 'calculate_tax',
  PROCESS_PAYMENT: 'process_payment',
  RESERVE_INVENTORY: 'reserve_inventory',
  SAVE_ORDER: 'save_order'
};

class OrderOrchestrator {
  constructor(options = {}) {
    this.services = {
      tax: options.taxService || TaxService,
      inventory: options.inventoryService || InventoryService,
      payment: options.paymentService || PaymentService,
      fraudCheck: options.fraudCheckService || FraudCheckService
    };
    
    this.db = options.db || db;
    
    this.pipeline = options.pipeline || [
      PIPELINE_STEPS.VALIDATE,
      PIPELINE_STEPS.CALCULATE_TAX,
      PIPELINE_STEPS.PROCESS_PAYMENT,
      PIPELINE_STEPS.RESERVE_INVENTORY,
      PIPELINE_STEPS.SAVE_ORDER
    ];
  }
  
  async processOrder(orderData) {
    const context = {
      orderData,
      orderId: `ORD-${Date.now()}`,
      userId: orderData.userId,
      items: orderData.items,
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentResult: null,
      inventoryReservation: null,
      stepResults: {},
      errors: []
    };
    
    try {
      for (const step of this.pipeline) {
        await this.executeStep(step, context);
      }
      
      return { success: true, orderId: context.orderId, total: context.total };
      
    } catch (error) {
      await this.handleError(error, context);
      return { success: false, error: error.message, code: error.code || 'PROCESSING_ERROR' };
    }
  }
  
  async executeStep(step, context) {
    const startTime = Date.now();
    
    try {
      switch (step) {
        case PIPELINE_STEPS.VALIDATE:
          await this.validateOrder(context);
          break;
        case PIPELINE_STEPS.FRAUD_CHECK:
          await this.runFraudCheck(context);
          break;
        case PIPELINE_STEPS.CALCULATE_TAX:
          await this.calculateTax(context);
          break;
        case PIPELINE_STEPS.PROCESS_PAYMENT:
          await this.processPayment(context);
          break;
        case PIPELINE_STEPS.RESERVE_INVENTORY:
          await this.reserveInventory(context);
          break;
        case PIPELINE_STEPS.SAVE_ORDER:
          await this.saveOrder(context);
          break;
        default:
          throw new Error(`Unknown pipeline step: ${step}`);
      }
      
      context.stepResults[step] = { success: true, duration: Date.now() - startTime };
      
    } catch (error) {
      context.stepResults[step] = { success: false, duration: Date.now() - startTime, error: error.message };
      throw error;
    }
  }
  
  async validateOrder(context) {
    const { items } = context.orderData;
    
    if (!items || items.length === 0) {
      throw new InvalidOrderError('No items in order');
    }
    
    for (const item of items) {
      if (!item.id) throw new InvalidOrderError('Item missing ID');
      if (!item.quantity || item.quantity <= 0) throw new InvalidOrderError('Invalid quantity');
      if (typeof item.price !== 'number' || item.price < 0) throw new InvalidOrderError('Invalid price');
    }
  }
  
  async runFraudCheck(context) {
    if (!this.services.fraudCheck) return;
    
    const result = await this.services.fraudCheck.checkFraud(context.orderData);
    if (!result.passed) {
      const error = new Error('Fraud check failed');
      error.code = 'FRAUD_CHECK_FAILED';
      throw error;
    }
  }
  
  async calculateTax(context) {
    const { items, orderData } = context;
    context.subtotal = this.services.tax.calculateSubtotal(items);
    const taxResult = this.services.tax.calculateTax(orderData, context.subtotal);
    context.tax = taxResult.taxAmount;
    context.total = context.subtotal + context.tax;
  }
  
  async processPayment(context) {
    const { orderData, total } = context;
    const result = await this.services.payment.authorizePayment(orderData.paymentToken, total);
    
    if (!result.success) {
      const error = new PaymentDeclinedError('Payment authorization failed');
      error.code = 'PAYMENT_FAILED';
      throw error;
    }
    
    context.paymentResult = result;
  }
  
  async reserveInventory(context) {
    const { items } = context;
    const result = await this.services.inventory.reserveStock(items);
    
    if (!result.success) {
      const error = new Error('Failed to reserve inventory after payment');
      error.code = 'INVENTORY_RESERVATION_FAILED';
      throw error;
    }
    
    context.inventoryReservation = result;
  }
  
  async saveOrder(context) {
    const { orderId, userId, total, items, paymentResult } = context;
    
    const orderRecord = {
      id: orderId,
      userId,
      subtotal: context.subtotal,
      tax: context.tax,
      total,
      status: 'PAID',
      items: items.map(item => ({ id: item.id, quantity: item.quantity, price: item.price })),
      paymentAuthorization: paymentResult?.authorizationCode,
      createdAt: new Date()
    };
    
    try {
      await this.db.save('orders', orderRecord);
      console.log(`Order ${orderId} completed for user ${userId}`);
    } catch (error) {
      throw new DatabaseError('Failed to save order');
    }
  }
  
  async handleError(error, context) {
    console.error('Order processing failed', error);
    
    if (context.paymentResult && context.paymentResult.success) {
      try {
        await this.services.payment.voidPayment(context.paymentResult.authorizationCode);
      } catch (voidError) {
        console.error('Failed to void payment', voidError);
      }
    }
    
    if (context.inventoryReservation && context.inventoryReservation.success) {
      try {
        await this.services.inventory.rollbackReservations(context.inventoryReservation.reservations);
      } catch (rollbackError) {
        console.error('Failed to rollback inventory', rollbackError);
      }
    }
  }
  
  addStep(stepName, handler) {
    this[stepName] = handler;
    this.pipeline.push(stepName);
  }
  
  removeStep(stepName) {
    const index = this.pipeline.indexOf(stepName);
    if (index > -1) this.pipeline.splice(index, 1);
  }
}

module.exports = { OrderOrchestrator, PIPELINE_STEPS };
