import { TRUNCATE_MAX_LEN } from './constants';

export function truncate(val: any, maxLen: number = TRUNCATE_MAX_LEN): any {
  if (val == null) return val;
  if (typeof val === 'string') {
    return val.length > maxLen ? val.substring(0, maxLen) + "..." : val;
  }
  // Handle objects and arrays
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      if (str.length > maxLen) {
        return JSON.parse(str.substring(0, maxLen) + "...");
      }
      return val;
    } catch {
      // If stringify fails, return a placeholder
      return "[Object]";
    }
  }
  return val;
}


export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines if an error is transient and should be retried
 * Transient errors: network errors, 5xx status codes, and 429 (rate limit)
 */
export function isTransientError(error: any): boolean {
  if (!error.response) return true; // Network errors
  const status = error.response.status;
  return (status >= 500 && status <= 599) || status === 429;
}
