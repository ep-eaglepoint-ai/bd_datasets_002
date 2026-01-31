import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const UpdateWebhookEndpoint = z.object({
  id: z.number(),
  name: z.string().min(2),
  url: z.string().url(),
  secret: z.string().min(8),
  enabled: z.boolean(),
  eventTypes: z.array(z.string().min(1)),
})

export default resolver.pipe(
  resolver.zod(UpdateWebhookEndpoint),
  resolver.authorize("ADMIN"),
  async ({ id, ...data }) => {
    return db.webhookEndpoint.update({
      where: { id },
      data,
    })
  }
)


