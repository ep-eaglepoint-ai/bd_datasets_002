/**
 * Tests verify that:
 * - attempts field is incremented correctly
 * - lastError captures error messages
 * - lastStatusCode captures HTTP status codes
 * - nextAttemptAt is set for retries
 */

import { describe, it, expect, vi } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { prisma, ensureCommitted } from "./setup"

describe("Requirement 9: Track attempt count, last error, last HTTP status, and next retry time", () => {
  it("should track all metrics on failure", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Metrics Test Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventId: "evt_metrics_fail",
        eventType: "user.created",
        payload: { test: true },
        status: "PENDING",
        nextAttemptAt: new Date(),
      },
    })

    // Mock fetch to return 429
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    })

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    expect(updated?.attempts).toBe(1)
    expect(updated?.lastStatusCode).toBe(429)
    expect(updated?.lastError).toContain("Non-2xx response: 429")
    expect(updated?.nextAttemptAt).toBeInstanceOf(Date)
    expect(updated?.status).toBe(WebhookDeliveryStatus.FAILED)
  })

  it("should reset error/status on success after failure", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Success Reset Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventId: "evt_reset_test",
        eventType: "user.created",
        payload: { test: true },
        status: WebhookDeliveryStatus.FAILED,
        attempts: 1,
        lastStatusCode: 500,
        lastError: "Previous Error",
        nextAttemptAt: new Date(),
      },
    })

    // Mock fetch to return 200
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    })

    await processWebhookDelivery(delivery.id)

    const updated = await prisma.webhookDelivery.findUnique({
      where: { id: delivery.id },
    })

    expect(updated?.attempts).toBe(2)
    expect(updated?.status).toBe(WebhookDeliveryStatus.SUCCESS)
    expect(updated?.lastStatusCode).toBe(200)
    expect(updated?.lastError).toBeNull()
    expect(updated?.nextAttemptAt).toBeNull()
  })
})
