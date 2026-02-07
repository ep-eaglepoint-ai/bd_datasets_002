import { APILogData } from './types';
import { LOG_HISTORY_SIZE } from './constants';
import { truncate } from './utils';

export class BoundedLogger {
  private logs: APILogData[] = [];
  private nextIdx = 0;

  /**
   * Adds a log entry to the bounded history
   * @param log - The log data to add
   * @param isBenchmark - If true, skips logging (for performance tests)
   */
  add(log: APILogData, isBenchmark: boolean = false): void {
    if (isBenchmark) return;
    
    const entry = {
      ...log,
      request: truncate(log.request),
      response: truncate(log.response)
    };
    
    if (this.logs.length < LOG_HISTORY_SIZE) {
      this.logs.push(entry);
    } else {
      this.logs[this.nextIdx] = entry;
      this.nextIdx = (this.nextIdx + 1) % LOG_HISTORY_SIZE;
    }
  }

  getHistory(): APILogData[] {
    return [...this.logs];
  }
}

/**
 * Sends a log message to console and adds to logger
 */
export async function sendLog(
  message: string,
  level: string,
  data: APILogData,
  logger: BoundedLogger,
  isBenchmark: boolean = false
): Promise<void> {
  logger.add(data, isBenchmark);
  if (isBenchmark) return;
  console.log(`${new Date().toISOString()} [${level.toUpperCase()}] ${message}`, truncate(data));
}
