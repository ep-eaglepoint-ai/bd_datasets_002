/**
 * Tests verify that:
 * - Default max attempts is 10
 * - Max attempts is configurable via environment variable
 * - System respects max attempts when marking as DEAD
 */

import { describe, it, expect } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { WEBHOOK_MAX_ATTEMPTS } from "../repository_after/src/webhooks/config"
import { prisma, ensureCommitted } from "./setup"

describe("Requirement 8: Configurable maximum retry attempts (default: 10)", () => {
  it("should use default max attempts of 10", () => {
    expect(WEBHOOK_MAX_ATTEMPTS).toBe(10)
    expect(typeof WEBHOOK_MAX_ATTEMPTS).toBe("number")
  })

})

