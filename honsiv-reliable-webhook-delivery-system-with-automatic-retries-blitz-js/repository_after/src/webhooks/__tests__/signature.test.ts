import { describe, expect, it } from "vitest"
import { createWebhookSignature, verifyWebhookSignature } from "../signature"

describe("webhook signature", () => {
  it("creates and verifies signature", () => {
    const payload = { a: 1 }
    const timestamp = "2025-01-01T00:00:00.000Z"
    const secret = "super-secret"
    const signature = createWebhookSignature({ secret, timestamp, payload })

    expect(verifyWebhookSignature({ secret, timestamp, payload, signature })).toBe(true)
  })
})


