/**
 * Requirement 7: Use exponential backoff with jitter between retries
 * 
 * Tests verify that:
 * - Backoff delay increases exponentially
 * - Jitter is applied to prevent thundering herd
 * - Maximum delay is capped at 12 hours
 */

import { describe, it, expect } from "vitest"
import { calculateNextAttemptAt } from "../repository_after/src/webhooks/backoff"
import { WEBHOOK_MAX_DELAY_MS, WEBHOOK_BASE_DELAY_MS } from "../repository_after/src/webhooks/config"

describe("Requirement 7: Use exponential backoff with jitter between retries", () => {
  it("should calculate exponential backoff with jitter", () => {
    const now = new Date()

    // Attempt 1: ~1 minute (base delay)
    const attempt1 = calculateNextAttemptAt(1, now)
    const delay1 = attempt1.getTime() - now.getTime()
    expect(delay1).toBeGreaterThan(WEBHOOK_BASE_DELAY_MS * 0.5) // Jitter: 0.5x to 1.5x
    expect(delay1).toBeLessThan(WEBHOOK_BASE_DELAY_MS * 1.5)

    // Attempt 2: ~2 minutes (2x base)
    const attempt2 = calculateNextAttemptAt(2, now)
    const delay2 = attempt2.getTime() - now.getTime()
    expect(delay2).toBeGreaterThan(WEBHOOK_BASE_DELAY_MS * 2 * 0.5)
    expect(delay2).toBeLessThan(WEBHOOK_BASE_DELAY_MS * 2 * 1.5)

    // Attempt 3: ~4 minutes (4x base)
    const attempt3 = calculateNextAttemptAt(3, now)
    const delay3 = attempt3.getTime() - now.getTime()
    expect(delay3).toBeGreaterThan(WEBHOOK_BASE_DELAY_MS * 4 * 0.5)
    expect(delay3).toBeLessThan(WEBHOOK_BASE_DELAY_MS * 4 * 1.5)

    // Attempt 4: ~8 minutes (8x base)
    const attempt4 = calculateNextAttemptAt(4, now)
    const delay4 = attempt4.getTime() - now.getTime()
    expect(delay4).toBeGreaterThan(WEBHOOK_BASE_DELAY_MS * 8 * 0.5)
    expect(delay4).toBeLessThan(WEBHOOK_BASE_DELAY_MS * 8 * 1.5)
  })

  it("should cap backoff at maximum delay (12 hours)", () => {
    const now = new Date()

    // Very high attempt number
    const attempt = calculateNextAttemptAt(100, now)
    const delay = attempt.getTime() - now.getTime()

    expect(delay).toBeLessThanOrEqual(WEBHOOK_MAX_DELAY_MS)
  })

  it("should apply jitter to prevent synchronized retries", () => {
    const now = new Date()
    const delays: number[] = []

    // Calculate same attempt multiple times - should get different delays due to jitter
    for (let i = 0; i < 10; i++) {
      const attempt = calculateNextAttemptAt(2, now)
      delays.push(attempt.getTime() - now.getTime())
    }

    // All delays should be different (or at least have variance)
    const uniqueDelays = new Set(delays)
    // With jitter, we should have some variance (not all identical)
    expect(uniqueDelays.size).toBeGreaterThan(1)
  })

  it("should have exponential growth pattern", () => {
    const now = new Date()

    const delays = [1, 2, 3, 4, 5, 6].map((attemptNum) => {
      const attempt = calculateNextAttemptAt(attemptNum, now)
      return attempt.getTime() - now.getTime()
    })

    // Each delay should be approximately double the previous (with jitter)
    // Due to jitter randomness, we check that delays generally increase
    // We'll check that later attempts have longer delays on average
    let increasingCount = 0
    for (let i = 1; i < delays.length; i++) {
      const ratio = delays[i] / delays[i - 1]
      // With jitter, ratio can vary, but should generally be > 0.5 (worst case: 1x * 0.5 / 1.5x = 0.33, but that's unlikely)
      // Most of the time it should be increasing
      if (ratio > 0.8) {
        increasingCount++
      }
    }
    // At least 3 out of 5 comparisons should show increase (accounting for jitter randomness)
    expect(increasingCount).toBeGreaterThanOrEqual(3)
  })

  it("should handle attempt number 0 correctly", () => {
    const now = new Date()

    // Attempt 0 should still work (edge case)
    const attempt = calculateNextAttemptAt(0, now)
    const delay = attempt.getTime() - now.getTime()

    expect(delay).toBeGreaterThan(0)
    expect(delay).toBeLessThanOrEqual(WEBHOOK_MAX_DELAY_MS)
  })
})

