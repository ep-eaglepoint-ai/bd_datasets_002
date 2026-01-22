import { redis, db, logger, transaction } from './infrastructure';
export class InventoryService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'inventory:';
  async getStock(productId: string): Promise<number> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      logger.info({ productId, source: 'cache', stock: cached });
      return parseInt(cached, 10);
    }
    const result = await db.query(
      'SELECT stock_quantity FROM inventory WHERE product_id = $1',
      [productId]
    );

    const stock = result.rows[0]?.stock_quantity ?? 0;
    await redis.set(cacheKey, stock.toString(), 'EX', this.CACHE_TTL);

    logger.info({ productId, source: 'database', stock });
    return stock;
  }

  /**
   * 
   * 
   * 
   *
   * 
   * @throws {Error} 
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;

    // Start database transaction
    await transaction(async (client) => {
      // Read current stock with row lock
      const result = await client.query(
        'SELECT stock_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [productId]
      );

      const currentStock = result.rows[0]?.stock_quantity ?? 0;

      // Validate sufficient stock
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock: ${currentStock} available, ${quantity} requested`);
      }

      // Update database
      const newStock = currentStock - quantity;
      await client.query(
        'UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE product_id = $2',
        [newStock, productId]
      );

      // Audit log
      await client.query(
        'INSERT INTO inventory_audit (product_id, delta, new_quantity, timestamp) VALUES ($1, $2, $3, NOW())',
        [productId, -quantity, newStock]
      );

      logger.info({ 
        productId, 
        action: 'decrement', 
        quantity, 
        newStock 
      });
    });

    const updatedResult = await db.query(
      'SELECT stock_quantity FROM inventory WHERE product_id = $1',
      [productId]
    );
    const updatedStock = updatedResult.rows[0]?.stock_quantity ?? 0;

    await redis.set(cacheKey, updatedStock.toString(), 'EX', this.CACHE_TTL);
  }
  async incrementStock(productId: string, quantity: number): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;

    await transaction(async (client) => {
      const result = await client.query(
        'SELECT stock_quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
        [productId]
      );

      const currentStock = result.rows[0]?.stock_quantity ?? 0;
      const newStock = currentStock + quantity;

      await client.query(
        'UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE product_id = $2',
        [newStock, productId]
      );

      await client.query(
        'INSERT INTO inventory_audit (product_id, delta, new_quantity, timestamp) VALUES ($1, $2, $3, NOW())',
        [productId, quantity, newStock]
      );

      logger.info({ 
        productId, 
        action: 'increment', 
        quantity, 
        newStock 
      });
    });

    await redis.del(cacheKey);
  }
}
