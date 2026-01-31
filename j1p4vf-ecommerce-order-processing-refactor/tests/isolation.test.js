/**
 * Isolation Tests for Order Processing
 * Requirement 7: Payment failure should NOT call inventory reservation
 */

const { OrderOrchestrator, PIPELINE_STEPS } = require('../repository_after/services/OrderOrchestrator');
const inventory = require('../repository_after/infra/inventory');
const gateway = require('../repository_after/infra/gateway');
const db = require('../repository_after/infra/db');

describe('Isolation Tests', () => {
  let orchestrator;
  let inventoryReserveSpy;
  let paymentAuthorizeSpy;

  beforeEach(() => {
    inventory.reset();
    gateway.reset();
    inventory.initStock('item-1', 100);
    inventory.initStock('item-2', 50);

    paymentAuthorizeSpy = jest.spyOn(gateway, 'authorize');
    inventoryReserveSpy = jest.spyOn(inventory, 'reserve');

    orchestrator = new OrderOrchestrator({
      taxService: require('../repository_after/services/TaxService'),
      inventoryService: require('../repository_after/services/InventoryService'),
      paymentService: require('../repository_after/services/PaymentService'),
      fraudCheckService: null,
      db: db
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Requirement 7: Payment failure should NOT call inventory reservation', async () => {
    const orderData = {
      userId: 'user-123',
      items: [
        { id: 'item-1', price: 10.00, quantity: 2 },
        { id: 'item-2', price: 25.00, quantity: 1 }
      ],
      paymentToken: 'declined',
      shippingAddress: { state: 'TX' }
    };

    const result = await orchestrator.processOrder(orderData);

    expect(result.success).toBe(false);
    expect(result.code).toBe('PAYMENT_FAILED');

    // CRITICAL: Verify inventory.reserve was NEVER called
    expect(inventoryReserveSpy).not.toHaveBeenCalled();
    expect(paymentAuthorizeSpy).toHaveBeenCalledTimes(1);
  });

  test('Requirement 4: Inventory should only be reserved after successful payment', async () => {
    const orderData = {
      userId: 'user-123',
      items: [
        { id: 'item-1', price: 10.00, quantity: 2 },
        { id: 'item-2', price: 25.00, quantity: 1 }
      ],
      paymentToken: 'valid-token',
      shippingAddress: { state: 'TX' }
    };

    const result = await orchestrator.processOrder(orderData);

    expect(result.success).toBe(true);
    expect(paymentAuthorizeSpy).toHaveBeenCalledTimes(1);
    expect(inventoryReserveSpy).toHaveBeenCalledTimes(2);
  });

  test('Should execute pipeline steps in correct order', async () => {
    const orderData = {
      userId: 'user-123',
      items: [{ id: 'item-1', price: 10.00, quantity: 2 }],
      paymentToken: 'valid-token',
      shippingAddress: { state: 'TX' }
    };

    const stepTracker = [];
    const originalExecuteStep = orchestrator.executeStep.bind(orchestrator);
    orchestrator.executeStep = jest.fn(async (step, context) => {
      stepTracker.push(step);
      return originalExecuteStep(step, context);
    });

    await orchestrator.processOrder(orderData);

    const expectedOrder = [
      PIPELINE_STEPS.VALIDATE,
      PIPELINE_STEPS.CALCULATE_TAX,
      PIPELINE_STEPS.PROCESS_PAYMENT,
      PIPELINE_STEPS.RESERVE_INVENTORY,
      PIPELINE_STEPS.SAVE_ORDER
    ];

    expect(stepTracker).toEqual(expectedOrder);
  });
});
