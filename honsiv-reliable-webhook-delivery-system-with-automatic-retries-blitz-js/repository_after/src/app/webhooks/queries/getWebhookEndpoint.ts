import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetWebhookEndpoint = z.object({ id: z.number() })

export default resolver.pipe(
  resolver.zod(GetWebhookEndpoint),
  resolver.authorize("ADMIN"),
  async ({ id }) => {
    return db.webhookEndpoint.findUnique({ where: { id } })
  }
)

