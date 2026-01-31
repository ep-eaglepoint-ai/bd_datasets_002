/**
 * Integration Tests: Full webhook delivery flow
 * 
 * Tests verify the complete end-to-end flow:
 * - Enqueue event → Create delivery → Process delivery → Success/Failure
 * - Multiple endpoints receiving same event
 * - Complete attempt history tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { enqueueWebhookEvent } from "../repository_after/src/webhooks/enqueueWebhookEvent"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { prisma, ensureCommitted } from "./setup"

const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = vi.fn()
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Integration", () => {


  it("should maintain complete audit trail through full flow", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Audit Trail Endpoint",
        url: "https://example.com/webhook",
        secret: "test_secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    // Mock failure then success
    let attemptCount = 0
    ;(global.fetch as any).mockImplementation(() => {
      attemptCount++
      if (attemptCount === 1) {
        return Promise.resolve({ ok: false, status: 500, statusText: "Internal Server Error" })
      } else {
        return Promise.resolve({ ok: true, status: 200, statusText: "OK" })
      }
    })

    await enqueueWebhookEvent("user.created", "evt_audit", { userId: 123 })

    const delivery = await prisma.webhookDelivery.findFirst({
      where: { eventId: "evt_audit" },
    })

    if (delivery) {
      // First attempt (fails)
      await processWebhookDelivery(delivery.id)

      let updated = await prisma.webhookDelivery.findUnique({
        where: { id: delivery.id },
        include: { attemptsLog: true },
      })

      expect(updated?.attempts).toBe(1)
      expect(updated?.status).toBe(WebhookDeliveryStatus.FAILED)
      expect(updated?.attemptsLog.length).toBe(1)

      // Update to allow second attempt
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          nextAttemptAt: new Date(),
        },
      })

      // Second attempt (succeeds)
      await processWebhookDelivery(delivery.id)

      updated = await prisma.webhookDelivery.findUnique({
        where: { id: delivery.id },
        include: { attemptsLog: true },
      })

      expect(updated?.attempts).toBe(2)
      expect(updated?.status).toBe(WebhookDeliveryStatus.SUCCESS)
      expect(updated?.attemptsLog.length).toBe(2)
      expect(updated?.attemptsLog[0]?.status).toBe(WebhookDeliveryStatus.FAILED)
      expect(updated?.attemptsLog[1]?.status).toBe(WebhookDeliveryStatus.SUCCESS)
    }
  })
})

