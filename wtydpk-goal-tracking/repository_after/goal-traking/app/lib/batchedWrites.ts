// Batched write queue for IndexedDB operations
// Reduces write frequency and improves performance

type WriteOperation = {
  type: 'goal' | 'milestone' | 'progressUpdate' | 'dependency' | 'versionSnapshot';
  action: 'save' | 'delete';
  data: unknown;
};

type BatchedWriteConfig = {
  maxBatchSize: number;
  flushIntervalMs: number;
  onFlush?: (operations: WriteOperation[]) => void;
};

const DEFAULT_CONFIG: BatchedWriteConfig = {
  maxBatchSize: 50,
  flushIntervalMs: 1000,
};

class BatchedWriteQueue {
  private queue: WriteOperation[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private config: BatchedWriteConfig;
  private flushCallback: ((ops: WriteOperation[]) => Promise<void>) | null = null;

  constructor(config: Partial<BatchedWriteConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setFlushCallback(callback: (ops: WriteOperation[]) => Promise<void>) {
    this.flushCallback = callback;
  }

  enqueue(operation: WriteOperation) {
    this.queue.push(operation);
    
    // Flush immediately if we hit max batch size
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
      return;
    }
    
    // Start flush timer if not already running
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    if (this.queue.length === 0) return;
    
    const operationsToFlush = [...this.queue];
    this.queue = [];
    
    try {
      if (this.flushCallback) {
        await this.flushCallback(operationsToFlush);
      }
      this.config.onFlush?.(operationsToFlush);
    } catch (error) {
      console.error('Batch flush failed:', error);
      // Re-queue failed operations at the front
      this.queue = [...operationsToFlush, ...this.queue];
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
  }
}

// Singleton instance
let batchedWriteQueue: BatchedWriteQueue | null = null;

export function getBatchedWriteQueue(): BatchedWriteQueue {
  if (!batchedWriteQueue) {
    batchedWriteQueue = new BatchedWriteQueue();
  }
  return batchedWriteQueue;
}

export function resetBatchedWriteQueue() {
  batchedWriteQueue?.clear();
  batchedWriteQueue = null;
}

export { BatchedWriteQueue };
export type { WriteOperation, BatchedWriteConfig };
