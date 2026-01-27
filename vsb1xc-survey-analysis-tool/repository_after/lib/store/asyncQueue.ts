/**
 * Async queue for ensuring race-condition-free state updates
 * Ensures operations complete in order and prevents concurrent modifications
 */

interface QueuedOperation<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class AsyncQueue {
  private queue: QueuedOperation<unknown>[] = [];
  private processing = false;

  /**
   * Enqueues an async operation, ensuring it runs after previous operations complete
   */
  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.queue.push({
        id,
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.process();
    });
  }

  /**
   * Processes the queue sequentially
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await item.operation();
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  /**
   * Clears the queue (use with caution)
   */
  clear(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Operation cancelled: queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Gets the current queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Checks if queue is processing
   */
  get isProcessing(): boolean {
    return this.processing;
  }
}

// Global async queue for state operations
export const stateQueue = new AsyncQueue();
