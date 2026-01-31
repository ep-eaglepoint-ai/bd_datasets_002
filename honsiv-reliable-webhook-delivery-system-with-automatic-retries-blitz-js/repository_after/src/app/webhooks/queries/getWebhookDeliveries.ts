import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { WebhookDeliveryStatus } from "@prisma/client"

const GetWebhookDeliveries = z.object({
  status: z.nativeEnum(WebhookDeliveryStatus).optional(),
  eventType: z.string().optional(),
  endpointId: z.number().optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
})

export default resolver.pipe(
  resolver.zod(GetWebhookDeliveries),
  resolver.authorize("ADMIN"),
  async ({ status, eventType, endpointId, take = 50, skip = 0 }) => {
    const where = {
      ...(status ? { status } : {}),
      ...(eventType ? { eventType } : {}),
      ...(endpointId ? { endpointId } : {}),
    }
    const [items, count] = await Promise.all([
      db.webhookDelivery.findMany({
        where,
        include: { endpoint: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      db.webhookDelivery.count({ where }),
    ])
    return { items, count }
  }
)

