import db from "db"
import { WebhookDeliveryStatus, Prisma } from "@prisma/client"
import { getQueue, createWorker } from "./queue"
import { calculateNextAttemptAt } from "./backoff"
import {
  WEBHOOK_JOB_NAME,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_REQUEST_TIMEOUT_MS,
  WEBHOOK_WORKER_CONCURRENCY,
} from "./config"
import { createWebhookSignature } from "./signature"

async function postWebhook(params: {
  url: string
  secret: string
  eventType: string
  eventId: string
  payload: unknown
}) {
  const timestamp = new Date().toISOString()
  const signature = createWebhookSignature({
    secret: params.secret,
    timestamp,
    payload: params.payload,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Blitz-Webhook-Worker/1.0",
        "X-Webhook-Id": params.eventId,
        "X-Webhook-Event": params.eventType,
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": `v1=${signature}`,
      },
      body: JSON.stringify(params.payload),
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export function getFailureUpdate(attemptNumber: number, now: Date) {
  if (attemptNumber >= WEBHOOK_MAX_ATTEMPTS) {
    return { status: WebhookDeliveryStatus.DEAD, nextAttemptAt: null }
  }
  return {
    status: WebhookDeliveryStatus.FAILED,
    nextAttemptAt: calculateNextAttemptAt(attemptNumber, now),
  }
}

export async function processWebhookDelivery(deliveryId: number) {
  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  })
  if (!delivery) return

  if (delivery.status === "SUCCESS" || delivery.status === "DEAD") return

  if (!delivery.endpoint.enabled) {
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "DEAD",
        lastError: "Endpoint disabled",
        nextAttemptAt: null,
      },
    })
    return
  }

  const now = new Date()
  const claim = await db.webhookDelivery.updateMany({
    where: {
      id: delivery.id,
      status: { in: ["PENDING", "FAILED"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    data: {
      status: "SENDING",
      lastAttemptAt: now,
      attempts: { increment: 1 },
    },
  })
  if (claim.count === 0) return

  // Refetch the delivery to get the updated attempts count
  const updatedDelivery = await db.webhookDelivery.findUnique({
    where: { id: delivery.id },
    include: { endpoint: true },
  })
  if (!updatedDelivery) {
    // Delivery was deleted, can't process
    return
  }

  const attemptNumber = updatedDelivery.attempts
  const attemptStartedAt = new Date()

  try {
    const response = await postWebhook({
      url: delivery.endpoint.url,
      secret: delivery.endpoint.secret,
      eventType: delivery.eventType,
      eventId: delivery.eventId,
      payload: delivery.payload,
    })

    if (response.ok) {
      await db.$transaction([
        db.webhookDelivery.update({
          where: { id: updatedDelivery.id },
          data: {
            status: "SUCCESS",
            lastStatusCode: response.status,
            lastError: null,
            nextAttemptAt: null,
          },
        }),
        db.webhookAttempt.create({
          data: {
            deliveryId: updatedDelivery.id,
            attemptNumber,
            status: "SUCCESS",
            statusCode: response.status,
            startedAt: attemptStartedAt,
            finishedAt: new Date(),
          },
        }),
      ])
      return
    }

    const failureUpdate = getFailureUpdate(attemptNumber, now)

    await db.$transaction([
      db.webhookDelivery.update({
        where: { id: updatedDelivery.id },
        data: {
          status: failureUpdate.status,
          lastStatusCode: response.status,
          lastError: `Non-2xx response: ${response.status}`,
          nextAttemptAt: failureUpdate.nextAttemptAt,
        },
      }),
      db.webhookAttempt.create({
        data: {
          deliveryId: updatedDelivery.id,
          attemptNumber,
          status: "FAILED",
          statusCode: response.status,
          error: `Non-2xx response: ${response.status}`,
          startedAt: attemptStartedAt,
          finishedAt: new Date(),
        },
      }),
    ])

    if (failureUpdate.status !== "DEAD" && failureUpdate.nextAttemptAt) {
      const queue = getQueue(WEBHOOK_JOB_NAME)
      const delay = Math.max(0, failureUpdate.nextAttemptAt.getTime() - Date.now())
      await queue.add("process-delivery", { deliveryId: updatedDelivery.id }, { delay })
    }
  } catch (error) {
    const failureUpdate = getFailureUpdate(attemptNumber, now)
    const message = error instanceof Error ? error.message : "Unknown error"

    // Refetch delivery to ensure it still exists
    const currentDelivery = await db.webhookDelivery.findUnique({
      where: { id: updatedDelivery.id },
    })
    if (!currentDelivery) {
      // Delivery was deleted, can't update
      return
    }

    try {
      await db.$transaction([
        db.webhookDelivery.update({
          where: { id: updatedDelivery.id },
          data: {
            status: failureUpdate.status,
            lastStatusCode: null,
            lastError: message,
            nextAttemptAt: failureUpdate.nextAttemptAt,
          },
        }),
        db.webhookAttempt.create({
          data: {
            deliveryId: updatedDelivery.id,
            attemptNumber,
            status: "FAILED",
            error: message,
            startedAt: attemptStartedAt,
            finishedAt: new Date(),
          },
        }),
      ])
    } catch (updateError) {
      // If delivery was deleted or doesn't exist, just log and continue
      if (updateError instanceof Prisma.PrismaClientKnownRequestError && updateError.code === "P2025") {
        console.warn(`Delivery ${updatedDelivery.id} not found for update, may have been deleted`)
        return
      }
      throw updateError
    }

    if (failureUpdate.status !== "DEAD" && failureUpdate.nextAttemptAt) {
      const queue = getQueue(WEBHOOK_JOB_NAME)
      const delay = Math.max(0, failureUpdate.nextAttemptAt.getTime() - Date.now())
      await queue.add("process-delivery", { deliveryId: updatedDelivery.id }, { delay })
    }
  }
}

export async function startWebhookWorker() {
  const worker = createWorker(
    WEBHOOK_JOB_NAME,
    async (job: any) => {
      await processWebhookDelivery(job.data.deliveryId)
    },
    { concurrency: WEBHOOK_WORKER_CONCURRENCY }
  )

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`)
  })

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })

  console.log(`Webhook worker started (concurrency: ${WEBHOOK_WORKER_CONCURRENCY})`)
}

