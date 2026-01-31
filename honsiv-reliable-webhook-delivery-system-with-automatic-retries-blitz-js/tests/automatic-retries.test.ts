/**
 * Tests verify that:
 * - Failed deliveries are re-enqueued for retry
 * - System schedules retries on non-2xx responses
 * - System schedules retries on network errors
 */

import { describe, it, expect, vi } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { getQueue } from "../repository_after/src/webhooks/queue"
import { prisma, ensureCommitted } from "./setup"

// Mock queue
const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: "job_id" }),
}

vi.mock("../repository_after/src/webhooks/queue", () => ({
  getQueue: vi.fn().mockReturnValue(mockQueue),
  createWorker: vi.fn(),
}))

describe("Requirement 4: Automatically retry failures", () => {
  it("should re-enqueue delivery for retry on 500 failure", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Retry Test Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventId: "evt_retry_test",
        eventType: "user.created",
        payload: { test: true },
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    })

    // Mock fetch to return 500
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    })

    const queueAddSpy = mockQueue.add
    queueAddSpy.mockClear()

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    expect(updated?.status).toBe(WebhookDeliveryStatus.FAILED)
    expect(updated?.attempts).toBe(1)
    expect(queueAddSpy).toHaveBeenCalledWith(
      "process-delivery",
      { deliveryId: delivery.id },
      expect.objectContaining({ delay: expect.any(Number) })
    )
  })

  it("should re-enqueue delivery for retry on network error", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Network Retry Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventId: "evt_network_error",
        eventType: "user.created",
        payload: { test: true },
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    })

    // Mock fetch to throw network error
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost"))

    const queueAddSpy = mockQueue.add
    queueAddSpy.mockClear()

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    expect(updated?.status).toBe(WebhookDeliveryStatus.FAILED)
    expect(updated?.lastError).toBe("Network connection lost")
    expect(queueAddSpy).toHaveBeenCalled()
  })
})
