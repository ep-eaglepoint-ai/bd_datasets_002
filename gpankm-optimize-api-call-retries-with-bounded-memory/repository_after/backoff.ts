import { BASE_DELAYS, JITTER_MIN, JITTER_MAX } from './constants';

// Seeded random number generator for deterministic jitter
 
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculates exponential backoff delay with jitter
 * @param attempt - The current retry attempt (0-indexed)
 * @returns Delay in milliseconds
 */
export function getBackoff(attempt: number): number {
  const base = BASE_DELAYS[Math.min(attempt, BASE_DELAYS.length - 1)];
  const jitter = JITTER_MIN + (JITTER_MAX - JITTER_MIN) * seededRandom(attempt + 0.5);
  return Math.floor(base * (1 + jitter));
}
