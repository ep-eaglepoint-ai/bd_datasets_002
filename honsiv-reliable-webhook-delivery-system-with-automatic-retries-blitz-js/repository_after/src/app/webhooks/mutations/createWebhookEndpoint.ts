import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const CreateWebhookEndpoint = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  secret: z.string().min(8),
  enabled: z.boolean().optional(),
  eventTypes: z.array(z.string().min(1)),
})

export default resolver.pipe(
  resolver.zod(CreateWebhookEndpoint),
  resolver.authorize("ADMIN"),
  async (data) => {
    return db.webhookEndpoint.create({
      data: {
        ...data,
        enabled: data.enabled ?? true,
      },
    })
  }
)


