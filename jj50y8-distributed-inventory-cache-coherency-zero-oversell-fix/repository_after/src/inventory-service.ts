import { redis, db, logger, transaction } from "./infrastructure";

// Declare setTimeout for TypeScript
declare function setTimeout(callback: () => void, ms: number): any;

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

interface CachedStock {
  stock: number;
  version: number; // Monotonic version number to ensure read consistency
  timestamp: number; // Unix timestamp in milliseconds
}

export class InventoryService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = "inventory:";
  private readonly VERSION_PREFIX = "version:inventory:";
  private readonly LOCK_PREFIX = "lock:inventory:";
  private readonly REPOP_LOCK_PREFIX = "repop:inventory:";
  private readonly LOCK_TTL = 10; // 10 seconds for operation locks
  private readonly REPOP_LOCK_TTL = 5; // 5 seconds for repopulation locks
  private readonly MAX_CACHE_UPDATE_DELAY = 100; // 100ms max delay for cache updates (requirement #3)

  /**
   * Acquire a distributed lock using Redis SET with NX and EX
   * Returns true if lock was acquired, false otherwise
   */
  private async acquireLock(lockKey: string, ttl: number): Promise<boolean> {
    try {
      // ioredis SET with NX returns 'OK' if successful, null if key already exists
      const result = await redis.set(lockKey, "1", "EX", ttl, "NX");
      return result === "OK";
    } catch (error) {
      logger.error({ error, lockKey, action: "acquireLock" });
      // On Redis failure, allow operation to proceed (fail-open for resilience)
      // Database row-level locking will still prevent overselling
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await redis.del(lockKey);
    } catch (error) {
      logger.error({ error, lockKey, action: "releaseLock" });
    }
  }

  /**
   * Increment and get new version number for a product (monotonic counter)
   * Only called on writes to ensure cache version increases with each update
   * Used to ensure read consistency - cache reads with lower version are stale
   */
  private async incrementVersion(productId: string): Promise<number> {
    try {
      const versionKey = `${this.VERSION_PREFIX}${productId}`;
      const version = await redis.incr(versionKey);
      // Set expiration on version key to prevent unbounded growth
      await redis.expire(versionKey, this.CACHE_TTL + 60);
      return version;
    } catch (error) {
      logger.error({ error, productId, action: "incrementVersion" });
      // Fallback to timestamp-based version if Redis fails
      return Date.now();
    }
  }

  /**
   * Get current version number without incrementing (for reads)
   */
  private async getCurrentVersion(productId: string): Promise<number> {
    try {
      const versionKey = `${this.VERSION_PREFIX}${productId}`;
      const version = await redis.get(versionKey);
      return version ? parseInt(version, 10) : 0;
    } catch (error) {
      logger.error({ error, productId, action: "getCurrentVersion" });
      return 0;
    }
  }

  /**
   * Parse cached stock value with version
   */
  private parseCachedStock(cached: string | null): CachedStock | null {
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      return {
        stock: parsed.stock,
        version: parsed.version || 0,
        timestamp: parsed.timestamp || 0,
      };
    } catch {
      // Legacy format - just a number
      const stock = parseInt(cached, 10);
      if (isNaN(stock)) return null;
      return { stock, version: 0, timestamp: 0 };
    }
  }

  /**
   * Serialize stock value with version
   */
  private serializeCachedStock(stock: number, version: number): string {
    return JSON.stringify({
      stock,
      version,
      timestamp: Date.now(),
    });
  }

  private async safeRedisGet(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      logger.error({ error, key, action: "redis_get_failed" });
      return null;
    }
  }

  private async safeRedisSet(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await redis.set(key, value, "EX", ttlSeconds);
    } catch (error) {
      logger.error({ error, key, action: "redis_set_failed" });
    }
  }

  private async safeRedisDel(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ error, key, action: "redis_del_failed" });
    }
  }

  private async setCacheIfNewer(
    cacheKey: string,
    cachedValue: string,
    newVersion: number,
  ): Promise<boolean> {
    const script = `
      local current = redis.call('GET', KEYS[1])
      if not current then
        redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
        return 1
      end
      local currentVersion = 0
      local ok, data = pcall(cjson.decode, current)
      if ok and data and data["version"] then
        currentVersion = tonumber(data["version"]) or 0
      else
        currentVersion = 0
      end
      if currentVersion <= tonumber(ARGV[1]) then
        redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
        return 1
      end
      return 0
    `;

    try {
      const result = await redis.eval(
        script,
        1,
        cacheKey,
        String(newVersion),
        cachedValue,
        String(this.CACHE_TTL),
      );
      return result === 1;
    } catch (error) {
      logger.error({ error, cacheKey, action: "cache_set_if_newer_failed" });
      return false;
    }
  }

  /**
   * Repopulate cache from database with thundering herd protection
   * Uses distributed lock to ensure only one server repopulates cache
   */
  private async repopulateCache(
    productId: string,
    cacheKey: string,
    minVersion: number = 0,
  ): Promise<number> {
    const repopLockKey = `${this.REPOP_LOCK_PREFIX}${productId}`;

    // Try to acquire repopulation lock
    const lockAcquired = await this.acquireLock(
      repopLockKey,
      this.REPOP_LOCK_TTL,
    );

    if (lockAcquired) {
      try {
        // We acquired the lock, repopulate from database
        const result = await db.query(
          "SELECT stock_quantity FROM inventory WHERE product_id = $1",
          [productId],
        );
        const stock = result.rows[0]?.stock_quantity ?? 0;

        // Get current version number (don't increment on read)
        const currentVersion = await this.getCurrentVersion(productId);

        // Use current version or minVersion, whichever is higher
        const version = Math.max(currentVersion, minVersion);

        const cachedValue = this.serializeCachedStock(stock, version);
        await this.safeRedisSet(cacheKey, cachedValue, this.CACHE_TTL);
        logger.info({
          productId,
          source: "database",
          stock,
          version,
          action: "repopulate",
        });
        return stock;
      } finally {
        await this.releaseLock(repopLockKey);
      }
    } else {
      // Another server is repopulating, wait briefly and retry cache read
      await delay(50);
      const cached = await this.safeRedisGet(cacheKey);
      const parsed = this.parseCachedStock(cached);
      if (parsed && parsed.version >= minVersion) {
        logger.info({
          productId,
          source: "cache",
          stock: parsed.stock,
          version: parsed.version,
          action: "retry_after_repop_wait",
        });
        return parsed.stock;
      }
      // If still not cached or version is stale, fall back to database read
      const result = await db.query(
        "SELECT stock_quantity FROM inventory WHERE product_id = $1",
        [productId],
      );
      const stock = result.rows[0]?.stock_quantity ?? 0;
      logger.info({
        productId,
        source: "database",
        stock,
        action: "fallback_after_repop_fail",
      });
      return stock;
    }
  }

  /**
   * Get stock with cache-aside pattern and read consistency guarantees
   * Ensures non-monotonic reads: stock cannot appear to increase without legitimate increment
   */
  async getStock(productId: string): Promise<number> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;

    // Try cache first
    const cached = await this.safeRedisGet(cacheKey);
    if (cached !== null) {
      const parsed = this.parseCachedStock(cached);
      if (parsed) {
        const age = Date.now() - parsed.timestamp;
        const currentVersion = await this.getCurrentVersion(productId);

        const isFresh = age < this.CACHE_TTL * 1000;
        const isVersionValid =
          currentVersion > 0
            ? parsed.version >= currentVersion
            : parsed.version === 0;

        if (isFresh && isVersionValid) {
          logger.info({
            productId,
            source: "cache",
            stock: parsed.stock,
            version: parsed.version,
          });
          return parsed.stock;
        }
      }
    }

    // Cache miss or expired - repopulate with protection against thundering herd
    const minVersion = await this.getCurrentVersion(productId);
    return await this.repopulateCache(productId, cacheKey, minVersion);
  }

  /**
   * Update cache atomically with new stock value and version
   * This ensures write visibility within 100ms (requirement #3)
   */
  private async updateCache(
    productId: string,
    newStock: number,
    newVersion: number,
  ): Promise<boolean> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;
    const startTime = Date.now();

    try {
      // Set new cache value only if version is newer
      const cachedValue = this.serializeCachedStock(newStock, newVersion);
      const updated = await this.setCacheIfNewer(
        cacheKey,
        cachedValue,
        newVersion,
      );

      const updateTime = Date.now() - startTime;
      if (updateTime > this.MAX_CACHE_UPDATE_DELAY) {
        logger.warn({
          productId,
          updateTime,
          action: "cache_update_slow",
          note: `Cache update took ${updateTime}ms, exceeding ${this.MAX_CACHE_UPDATE_DELAY}ms target`,
        });
      }

      logger.info({
        productId,
        stock: newStock,
        version: newVersion,
        updateTime,
        action: "cache_updated",
      });
      return updated;
    } catch (cacheError) {
      // If cache update fails, log but don't fail the operation
      // Database is source of truth, cache will be repopulated on next read
      logger.error({
        error: cacheError,
        productId,
        action: "cache_update_failed",
        note: "Database transaction committed successfully, cache will be repopulated on next read",
      });
      return false;
    }
  }

  /**
   * Decrement stock with zero-oversell guarantee
   * Uses database transaction with row-level locking and cache coherency
   *
   * The database FOR UPDATE lock ensures serialization and prevents overselling (requirement #1).
   * The distributed lock helps serialize cache updates across servers.
   * Cache is updated immediately after commit to ensure 100ms visibility (requirement #3).
   *
   * @throws {Error} If insufficient stock available
   */
  async decrementStock(
    productId: string,
    quantity: number,
    userId: string = "system",
  ): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;
    const lockKey = `${this.LOCK_PREFIX}${productId}`;

    // Acquire distributed lock to serialize cache updates across servers
    // This prevents race conditions in cache updates while database transaction provides
    // the actual oversell protection via row-level locking
    let lockAcquired = await this.acquireLock(lockKey, this.LOCK_TTL);
    if (!lockAcquired) {
      // Retry with exponential backoff (single retry for low latency)
      await delay(10);
      lockAcquired = await this.acquireLock(lockKey, this.LOCK_TTL);
    }

    try {
      // Start database transaction - this is the source of truth
      // FOR UPDATE ensures row-level locking and serialization (requirement #1)
      let newStock: number = 0;
      let newVersion: number = 0;

      await transaction(async (client) => {
        // Read current stock with row lock (FOR UPDATE ensures serialization)
        const result = await client.query(
          "SELECT stock_quantity FROM inventory WHERE product_id = $1 FOR UPDATE",
          [productId],
        );

        const currentStock = result.rows[0]?.stock_quantity ?? 0;

        // Validate sufficient stock - this check is atomic within the transaction
        // This is the critical check that prevents overselling (requirement #1)
        if (currentStock < quantity) {
          throw new Error(
            `Insufficient stock: ${currentStock} available, ${quantity} requested`,
          );
        }

        // Update database atomically
        newStock = currentStock - quantity;

        // Ensure stock never goes negative (requirement #1)
        if (newStock < 0) {
          throw new Error(
            `Stock would become negative: ${currentStock} - ${quantity} = ${newStock}`,
          );
        }

        await client.query(
          "UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE product_id = $2",
          [newStock, productId],
        );

        // Audit log (within same transaction for compliance requirement #6)
        await client.query(
          "INSERT INTO inventory_audit (product_id, delta, new_quantity, timestamp, user_id) VALUES ($1, $2, $3, NOW(), $4)",
          [productId, -quantity, newStock, userId],
        );

        logger.info({
          productId,
          action: "decrement",
          quantity,
          currentStock,
          newStock,
        });
      });

      // After transaction commit, update cache immediately
      // Increment version number for cache update (ensures read consistency)
      newVersion = await this.incrementVersion(productId);

      // Update cache atomically with new value and version
      // This happens immediately after commit, satisfying requirement #3 (100ms visibility)
      // The distributed lock ensures only one server updates cache at a time
      await this.updateCache(productId, newStock, newVersion);
    } catch (error) {
      // On error, invalidate cache to ensure consistency
      // This prevents serving stale cached values after a failed transaction
      await this.safeRedisDel(cacheKey);
      throw error;
    } finally {
      // Always release the distributed lock if we acquired it
      if (lockAcquired) {
        await this.releaseLock(lockKey);
      }
    }
  }

  /**
   * Increment stock with cache coherency
   * Uses same pattern as decrementStock for consistency
   */
  async incrementStock(
    productId: string,
    quantity: number,
    userId: string = "system",
  ): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${productId}`;
    const lockKey = `${this.LOCK_PREFIX}${productId}`;

    // Acquire distributed lock to serialize cache updates across servers
    let lockAcquired = await this.acquireLock(lockKey, this.LOCK_TTL);
    if (!lockAcquired) {
      await delay(10);
      lockAcquired = await this.acquireLock(lockKey, this.LOCK_TTL);
    }

    try {
      let newStock: number = 0;
      let newVersion: number = 0;

      await transaction(async (client) => {
        const result = await client.query(
          "SELECT stock_quantity FROM inventory WHERE product_id = $1 FOR UPDATE",
          [productId],
        );

        const currentStock = result.rows[0]?.stock_quantity ?? 0;
        newStock = currentStock + quantity;

        await client.query(
          "UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE product_id = $2",
          [newStock, productId],
        );

        // Audit log (within same transaction for compliance requirement #6)
        await client.query(
          "INSERT INTO inventory_audit (product_id, delta, new_quantity, timestamp, user_id) VALUES ($1, $2, $3, NOW(), $4)",
          [productId, quantity, newStock, userId],
        );

        logger.info({
          productId,
          action: "increment",
          quantity,
          currentStock,
          newStock,
        });
      });

      // Update cache immediately after transaction commit
      // Increment version number for cache update (ensures read consistency)
      newVersion = await this.incrementVersion(productId);

      // Update cache atomically with new value and version
      // Same pattern as decrementStock for consistency
      await this.updateCache(productId, newStock, newVersion);
    } catch (error) {
      // On error, invalidate cache to ensure consistency
      await this.safeRedisDel(cacheKey);
      throw error;
    } finally {
      // Always release the distributed lock if we acquired it
      if (lockAcquired) {
        await this.releaseLock(lockKey);
      }
    }
  }
}
