import { InventoryService } from './inventory-service';
import { db, redis } from './infrastructure';

async function demo() {
  const service = new InventoryService();
  
  console.log('=== Inventory Service Demo ===\n');
  
  const stock = await service.getStock('PRODUCT-001');
  console.log(`Current stock for PRODUCT-001: ${stock}`);
  
  try {
    await service.decrementStock('PRODUCT-001', 5);
    console.log('Successfully purchased 5 items');
  } catch (error: any) {
    console.error('Purchase failed:', error.message);
  }
  
  // Check updated stock
  const newStock = await service.getStock('PRODUCT-001');
  console.log(`Updated stock: ${newStock}`);
  
  // Cleanup
  await db.end();
  await redis.quit();
}

demo();
