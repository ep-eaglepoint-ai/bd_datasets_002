import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { getQueue } from "src/webhooks/queue"
import { WEBHOOK_JOB_NAME } from "src/webhooks/config"

const RetryWebhookDelivery = z.object({
  id: z.number(),
  force: z.boolean().optional(),
})

export default resolver.pipe(
  resolver.zod(RetryWebhookDelivery),
  resolver.authorize("ADMIN"),
  async ({ id, force = false }) => {
    const delivery = await db.webhookDelivery.findUnique({
      where: { id },
      include: { endpoint: true },
    })
    if (!delivery) return null

    if (!delivery.endpoint.enabled && !force) {
      throw new Error("Endpoint is disabled")
    }

    const now = new Date()
    await db.webhookDelivery.update({
      where: { id },
      data: {
        status: "PENDING",
        nextAttemptAt: now,
      },
    })

    const queue = getQueue(WEBHOOK_JOB_NAME)
    await queue.add("process-delivery", { deliveryId: id })

    return { id }
  }
)

