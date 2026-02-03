/**
 * Mock inventory client for stock reservation
 */
const stockStorage = new Map();

function initStock(itemId, quantity) {
  stockStorage.set(itemId, quantity);
}

async function checkStock(itemId) {
  await new Promise(resolve => setTimeout(resolve, 10));
  return stockStorage.get(itemId) || 0;
}

async function reserve(itemId, quantity) {
  await new Promise(resolve => setTimeout(resolve, 10));
  const currentStock = stockStorage.get(itemId) || 0;
  
  if (currentStock < quantity) {
    return { success: false, error: 'INSUFFICIENT_STOCK' };
  }
  
  stockStorage.set(itemId, currentStock - quantity);
  return { success: true, itemId, quantityReserved: quantity, remainingStock: currentStock - quantity };
}

async function release(itemId, quantity) {
  await new Promise(resolve => setTimeout(resolve, 10));
  const currentStock = stockStorage.get(itemId) || 0;
  stockStorage.set(itemId, currentStock + quantity);
  return { success: true, itemId, quantityReleased: quantity };
}

function reset() {
  stockStorage.clear();
}

module.exports = { checkStock, reserve, release, reset, initStock };
