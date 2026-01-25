"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inventory_service_1 = require("./inventory-service");
const infrastructure_1 = require("./infrastructure");
async function demo() {
    const service = new inventory_service_1.InventoryService();
    console.log('=== Inventory Service Demo ===\n');
    const stock = await service.getStock('PRODUCT-001');
    console.log(`Current stock for PRODUCT-001: ${stock}`);
    try {
        await service.decrementStock('PRODUCT-001', 5);
        console.log('Successfully purchased 5 items');
    }
    catch (error) {
        console.error('Purchase failed:', error.message);
    }
    // Check updated stock
    const newStock = await service.getStock('PRODUCT-001');
    console.log(`Updated stock: ${newStock}`);
    // Cleanup
    await infrastructure_1.db.end();
    await infrastructure_1.redis.quit();
}
demo();
