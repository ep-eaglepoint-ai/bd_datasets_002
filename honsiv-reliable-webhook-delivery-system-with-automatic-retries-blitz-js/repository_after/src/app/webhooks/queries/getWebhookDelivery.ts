import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetWebhookDelivery = z.object({ id: z.number() })

export default resolver.pipe(
  resolver.zod(GetWebhookDelivery),
  resolver.authorize("ADMIN"),
  async ({ id }) => {
    return db.webhookDelivery.findUnique({
      where: { id },
      include: { endpoint: true, attemptsLog: { orderBy: { startedAt: "desc" } } },
    })
  }
)

