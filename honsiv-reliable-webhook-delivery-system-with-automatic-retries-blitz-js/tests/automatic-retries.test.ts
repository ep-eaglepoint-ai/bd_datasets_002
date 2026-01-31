/**
 * Tests verify that:
 * - Failed deliveries are scheduled for retry (nextAttemptAt is set)
 * - System schedules retries on non-2xx responses
 * - System schedules retries on network errors
 */

import { describe, it, expect, vi } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { prisma } from "./setup"

describe("Requirement 4: Automatically retry failures", () => {
  it("should schedule delivery for retry on 500 failure", async () => {
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
        nextAttemptAt: new Date(Date.now() - 1000),
      },
    })

    // Mock fetch to return 500
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
    })

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    // Verify retry is scheduled
    expect(updated?.status).toBe(WebhookDeliveryStatus.FAILED)
    expect(updated?.attempts).toBe(1)
    expect(updated?.nextAttemptAt).not.toBeNull()
    expect(updated?.nextAttemptAt).toBeInstanceOf(Date)
    // Verify nextAttemptAt is in the future (retry scheduled)
    expect(updated?.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now())
  })

  it("should schedule delivery for retry on network error", async () => {
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
        nextAttemptAt: new Date(Date.now() - 1000),
      },
    })

    // Mock fetch to throw network error
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost"))

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    // Verify retry is scheduled
    expect(updated?.status).toBe(WebhookDeliveryStatus.FAILED)
    expect(updated?.lastError).toBe("Network connection lost")
    expect(updated?.nextAttemptAt).not.toBeNull()
    expect(updated?.nextAttemptAt).toBeInstanceOf(Date)
    // Verify nextAttemptAt is in the future (retry scheduled)
    expect(updated?.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now())
  })
})
