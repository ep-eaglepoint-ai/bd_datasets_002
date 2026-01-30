// filename: OrderProcessor.js

// Import documentation:
// Mock database client for persistence simulation
const db = require("./infra/db");
// Mock inventory client for stock reservation
const inventory = require("./infra/inventory");
// Mock payment gateway for credit card processing
const gateway = require("./infra/gateway");

/**
 * LEGACY MONOLITHIC ORDER PROCESSOR
 * This function is the primary target for refactoring.
 */
async function processOrder(orderData) {
  const { userId, items, paymentToken, shippingAddress } = orderData;

  // PROBLEM 1: Direct object mutation and scattered validation
  if (!items || items.length === 0)
    return { success: false, error: "No items" };

  let subtotal = 0;
  for (const item of items) {
    // PROBLEM 2: Direct dependency on inventory mock inside loop
    const stock = await inventory.checkStock(item.id);
    if (stock < item.quantity) {
      return { success: false, error: `Out of stock: ${item.id}` };
    }
    subtotal += item.price * item.quantity;
  }

  // PROBLEM 3: Hardcoded business rules (Tax Rates)
  let taxRate = 0.0825; // Texas State Tax hardcoded
  if (shippingAddress.state === "CA") taxRate = 0.0925; // California
  const total = subtotal * (1 + taxRate);

  // PROBLEM 4: Payment side-effects mixed with inventory locking
  try {
    const charge = await gateway.authorize(paymentToken, total);
    if (charge.status === "APPROVED") {
      // Reserve stock after payment success
      for (const item of items) {
        await inventory.reserve(item.id, item.quantity);
      }

      const orderRecord = {
        id: `ORD-${Date.now()}`,
        userId,
        total,
        status: "PAID",
        createdAt: new Date(),
      };

      // PROBLEM 5: Deeply nested database calls
      await db.save("orders", orderRecord);
      console.log(`Order ${orderRecord.id} completed for user ${userId}`);

      return { success: true, orderId: orderRecord.id };
    } else {
      return { success: false, error: "Payment Denied" };
    }
  } catch (err) {
    // PROBLEM 6: Generic catch-all with no specific error recovery
    console.error("Fatal error in order process", err);
    return { success: false, error: "Internal Server Error" };
  }
}

module.exports = { processOrder };
