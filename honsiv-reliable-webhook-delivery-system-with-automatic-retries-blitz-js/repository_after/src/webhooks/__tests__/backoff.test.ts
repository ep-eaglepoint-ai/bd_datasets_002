import { describe, expect, it } from "vitest"
import { calculateNextAttemptAt } from "../backoff"

describe("backoff", () => {
  it("applies exponential backoff with jitter", () => {
    const now = new Date("2025-01-01T00:00:00.000Z")
    const rand = () => 0.5
    const next = calculateNextAttemptAt(2, now, rand)
    expect(next.getTime()).toBeGreaterThan(now.getTime())
  })
})


