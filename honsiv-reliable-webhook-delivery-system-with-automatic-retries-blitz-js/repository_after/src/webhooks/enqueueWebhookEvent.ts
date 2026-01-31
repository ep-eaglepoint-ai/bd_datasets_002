import db from "db"
import { Prisma } from "@prisma/client"
import { getQueue } from "./queue"
import { WEBHOOK_JOB_NAME } from "./config"

export async function enqueueWebhookEvent(
  eventType: string,
  eventId: string,
  payload: unknown
) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: {
      enabled: true,
      eventTypes: { has: eventType },
    },
  })

  const queue = getQueue(WEBHOOK_JOB_NAME)
  const now = new Date()
  let createdCount = 0

  for (const endpoint of endpoints) {
    try {
      const delivery = await db.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventType,
          eventId,
          payload,
          status: "PENDING",
          nextAttemptAt: now,
        },
      })

      await queue.add("process-delivery", { deliveryId: delivery.id })
      createdCount += 1
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint violation (idempotency - delivery already exists)
        // P2003: Foreign key constraint violation (endpoint was deleted)
        if (error.code === "P2002" || error.code === "P2003") {
          continue
        }
      }
      throw error
    }
  }

  return createdCount
}

