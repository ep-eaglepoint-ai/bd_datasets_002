/**
 * Tests verify that:
 * - Duplicate calls to enqueueWebhookEvent for same event/endpoint are ignored
 * - Database unique constraint (endpointId, eventId) prevents duplicate deliveries
 */

import { describe, it, expect } from "vitest"
import { enqueueWebhookEvent } from "../repository_after/src/webhooks/enqueueWebhookEvent"
import { prisma, ensureCommitted } from "./setup"

describe("Requirement 3: Guarantee idempotent delivery per endpoint and event", () => {
  it("should not create duplicate deliveries for same event and endpoint", async () => {
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: "Idempotent Endpoint",
        url: "https://example.com/webhook",
        secret: "secret",
        enabled: true,
        eventTypes: ["user.created"],
      },
    })

    await ensureCommitted()

    // First enqueue
    const count1 = await enqueueWebhookEvent("user.created", "evt_idemp_1", { userId: 1 })
    expect(count1).toBe(1)

    // Second enqueue with same eventId
    const count2 = await enqueueWebhookEvent("user.created", "evt_idemp_1", { userId: 1 })
    expect(count2).toBe(0) // Should skip creation

    // Verify only one delivery exists
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { eventId: "evt_idemp_1", endpointId: endpoint.id },
    })
    expect(deliveries.length).toBe(1)
  })
})
