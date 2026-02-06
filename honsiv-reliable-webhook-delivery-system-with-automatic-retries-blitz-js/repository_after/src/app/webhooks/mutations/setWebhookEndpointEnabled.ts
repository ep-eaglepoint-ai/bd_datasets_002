import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const SetWebhookEndpointEnabled = z.object({ id: z.number(), enabled: z.boolean() })

export default resolver.pipe(
  resolver.zod(SetWebhookEndpointEnabled),
  resolver.authorize("ADMIN"),
  async ({ id, enabled }) => {
    return db.webhookEndpoint.update({ where: { id }, data: { enabled } })
  }
)


