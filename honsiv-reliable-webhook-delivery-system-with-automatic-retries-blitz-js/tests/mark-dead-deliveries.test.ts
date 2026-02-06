/**
 * Tests verify that:
 * - Deliveries are marked as DEAD after max attempts
 * - DEAD deliveries have nextAttemptAt set to null
 * - No further automatic retries are scheduled for DEAD deliveries
 */

import { describe, it, expect } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { WEBHOOK_MAX_ATTEMPTS } from "../repository_after/src/webhooks/config"
import { prisma, ensureCommitted } from "./setup"

describe("Requirement 5: Mark deliveries as permanently failed after max retry attempts", () => {
  it("should mark delivery as DEAD after reaching max attempts", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Dead Test Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventId: "evt_dead_test",
        eventType: "user.created",
        payload: { test: true },
        status: WebhookDeliveryStatus.FAILED,
        attempts: WEBHOOK_MAX_ATTEMPTS - 1,
        nextAttemptAt: new Date(),
      },
    })

    // Mock fetch to fail
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    expect(updated?.status).toBe(WebhookDeliveryStatus.DEAD)
    expect(updated?.attempts).toBe(WEBHOOK_MAX_ATTEMPTS)
    expect(updated?.nextAttemptAt).toBeNull()
    expect(updated?.lastError).toContain("Non-2xx response: 500")
  })

  it("should not process deliveries already marked as DEAD", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Already Dead Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventId: "evt_already_dead",
        eventType: "user.created",
        payload: { test: true },
        status: WebhookDeliveryStatus.DEAD,
        attempts: WEBHOOK_MAX_ATTEMPTS,
        nextAttemptAt: null,
      },
    })

    const fetchSpy = vi.fn()
    global.fetch = fetchSpy

    await processWebhookDelivery(delivery.id)

    // Should return early without calling fetch
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

