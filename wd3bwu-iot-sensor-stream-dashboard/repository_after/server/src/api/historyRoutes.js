const express = require('express');
const { RequestCoalescer } = require('../thunderingHerd/RequestCoalescer');

/**
 * Create history routes for historical data queries
 * 
 * Requirement 2: Support immediate 'last 10 minutes' queries
 * Requirement 4: Handle thundering herd scenario
 * 
 * @param {SlidingWindowBuffer} buffer 
 * @param {Database} db
 * @returns {express.Router}
 */
function createHistoryRoutes(buffer, db) {
  const router = express.Router();
  const coalescer = new RequestCoalescer({
    cacheTTLMs: 1000,   // 1 second cache
    maxConcurrent: 10   // Max 10 concurrent heavy queries
  });

  /**
   * GET /api/history/:sensorId
   * Query historical data for a single sensor
   * 
   * Query params:
   * - start: Start timestamp (ms) - optional, defaults to 10 min ago
   * - end: End timestamp (ms) - optional, defaults to now
   * - last: Get last N points instead of time range
   */
  router.get('/:sensorId', async (req, res) => {
    try {
      const { sensorId } = req.params;
      const { start, end, last } = req.query;
      
      // If 'last' is specified, get last N points
      if (last) {
        const count = parseInt(last, 10);
        if (isNaN(count) || count < 1 || count > 10000) {
          return res.status(400).json({ 
            error: 'Invalid "last" parameter. Must be between 1 and 10000.' 
          });
        }
        
        // "Last N" is usually recent, try buffer first
        // If buffer has enough, return it. If not, maybe DB?
        // Simplicity: Just return what buffer has for "last". 
        // If user wants historical "last N", they should use time range.
        const data = buffer.getLastN(sensorId, count);
        return res.json({
          sensorId,
          count: data.length,
          data
        });
      }
      
      // Time range query
      const now = Date.now();
      const endMs = end ? parseInt(end, 10) : now;
      const startMs = start ? parseInt(start, 10) : now - 10 * 60 * 1000;
      
      if (isNaN(startMs) || isNaN(endMs)) {
        return res.status(400).json({ error: 'Invalid start or end timestamp' });
      }
      
      if (startMs > endMs) {
        return res.status(400).json({ error: 'Start must be before end' });
      }
      
      // Use coalescer to prevent thundering herd
      const key = coalescer.generateKey(sensorId, startMs, endMs);
      const data = await coalescer.execute(key, async () => {
        // Optimization: Check if fully in buffer
        const bufferWindowStart = Date.now() - buffer.windowSizeMs;
        
        if (startMs >= bufferWindowStart) {
            // Fully in buffer
            return buffer.getRange(sensorId, startMs, endMs);
        } else if (endMs < bufferWindowStart) {
            // Fully in DB
            return await db.queryRange(sensorId, startMs, endMs);
        } else {
            // Overlaps both
            // Split the query
            const dbData = await db.queryRange(sensorId, startMs, bufferWindowStart);
            const bufferData = buffer.getRange(sensorId, bufferWindowStart, endMs);
            
            // Simple merge (dbData should be older)
            return [...dbData, ...bufferData];
        }
      });
      
      res.json({
        sensorId,
        startMs,
        endMs,
        count: data.length,
        data
      });
    } catch (err) {
      console.error('Error fetching history:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/history/batch
   * Query historical data for multiple sensors
   * 
   * Body:
   * {
   *   sensorIds: [...],
   *   start: number (optional),
   *   end: number (optional)
   * }
   */
  router.post('/batch', async (req, res) => {
    try {
      const { sensorIds, start, end } = req.body;
      
      if (!Array.isArray(sensorIds) || sensorIds.length === 0) {
        return res.status(400).json({ error: 'sensorIds must be a non-empty array' });
      }
      
      if (sensorIds.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 sensors per batch request' });
      }
      
      const now = Date.now();
      const endMs = end || now;
      const startMs = start || now - 10 * 60 * 1000;
      
      // Fetch all sensors with coalescing
      const results = {};
      const bufferWindowStart = Date.now() - buffer.windowSizeMs;

      await Promise.all(sensorIds.map(async (sensorId) => {
        const key = coalescer.generateKey(sensorId, startMs, endMs);
        const data = await coalescer.execute(key, async () => {
             if (startMs >= bufferWindowStart) {
                return buffer.getRange(sensorId, startMs, endMs);
            } else if (endMs < bufferWindowStart) {
                return await db.queryRange(sensorId, startMs, endMs);
            } else {
                const dbData = await db.queryRange(sensorId, startMs, bufferWindowStart);
                const bufferData = buffer.getRange(sensorId, bufferWindowStart, endMs);
                return [...dbData, ...bufferData];
            }
        });
        results[sensorId] = data;
      }));
      
      res.json({
        startMs,
        endMs,
        sensors: results
      });
    } catch (err) {
      console.error('Error fetching batch history:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/history/stats
   * Get buffer and coalescer statistics
   */
  router.get('/stats', (req, res) => {
    res.json({
      buffer: buffer.getEvictionStats(),
      coalescer: coalescer.getStats()
    });
  });

  return router;
}

module.exports = { createHistoryRoutes };
