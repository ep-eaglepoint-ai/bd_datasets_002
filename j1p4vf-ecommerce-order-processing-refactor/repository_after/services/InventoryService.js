/**
 * InventoryService - Handles inventory management operations
 * Requirement 1: Service Decoupling
 */

const inventory = require('../infra/inventory');
const { OutOfStockError } = require('../errors/OrderProcessingError');

async function validateStockAvailability(items) {
  if (!items || items.length === 0) {
    return { available: false, error: 'No items provided' };
  }
  
  const unavailableItems = [];
  
  for (const item of items) {
    const stock = await inventory.checkStock(item.id);
    if (stock < item.quantity) {
      unavailableItems.push({
        itemId: item.id,
        requestedQuantity: item.quantity,
        availableQuantity: stock
      });
    }
  }
  
  if (unavailableItems.length > 0) {
    return { available: false, unavailableItems };
  }
  
  return { available: true, items };
}

async function reserveStock(items) {
  if (!items || items.length === 0) {
    return { success: false, error: 'No items to reserve' };
  }
  
  const reservations = [];
  const failedReservations = [];
  
  for (const item of items) {
    const result = await inventory.reserve(item.id, item.quantity);
    if (result.success) {
      reservations.push({ itemId: item.id, quantity: item.quantity });
    } else {
      failedReservations.push({ itemId: item.id, quantity: item.quantity });
    }
  }
  
  if (failedReservations.length > 0) {
    await rollbackReservations(reservations);
    return { success: false, failedItems: failedReservations, reservationsRolledBack: true };
  }
  
  return { success: true, reservations };
}

async function rollbackReservations(reservations) {
  const rollbacks = [];
  for (const reservation of reservations) {
    const result = await inventory.release(reservation.itemId, reservation.quantity);
    rollbacks.push({ itemId: reservation.itemId, released: result.success });
  }
  return { success: true, rollbacks };
}

async function areItemsInStock(items) {
  const validation = await validateStockAvailability(items);
  return validation.available;
}

module.exports = {
  validateStockAvailability,
  reserveStock,
  rollbackReservations,
  areItemsInStock
};
