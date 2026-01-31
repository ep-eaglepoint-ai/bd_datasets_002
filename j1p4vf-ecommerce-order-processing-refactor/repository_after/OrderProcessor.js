/**
 * REFACTORED ORDER PROCESSOR
 * 
 * This is the refactored version implementing:
 * - Service Decoupling (TaxService, InventoryService, PaymentService)
 * - Pipeline Orchestration Pattern
 * - Standardized Error Handling
 * - Transactional Parity (inventory reserved only after payment)
 * - Tax Rule Externalization
 * - Data Shape Preservation
 */

// Import the OrderOrchestrator
const { OrderOrchestrator } = require('./services/OrderOrchestrator');

let orchestratorInstance = null;

function getOrchestrator() {
  if (!orchestratorInstance) {
    orchestratorInstance = new OrderOrchestrator();
  }
  return orchestratorInstance;
}

function setOrchestrator(orchestrator) {
  orchestratorInstance = orchestrator;
}

/**
 * Process an order using the refactored pipeline architecture
 * @param {Object} orderData - The order data
 * @returns {Promise<Object>} Result with {success, orderId?, error?}
 */
async function processOrder(orderData) {
  const orchestrator = getOrchestrator();
  
  try {
    const result = await orchestrator.processOrder(orderData);
    
    // Ensure return shape matches legacy API
    if (result.success) {
      return { success: true, orderId: result.orderId };
    } else {
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('Unexpected error in order processing', error);
    return { success: false, error: error.message || 'Internal Server Error' };
  }
}

function createCustomOrchestrator(options) {
  return new OrderOrchestrator(options);
}

module.exports = {
  processOrder,
  getOrchestrator,
  setOrchestrator,
  createCustomOrchestrator
};
