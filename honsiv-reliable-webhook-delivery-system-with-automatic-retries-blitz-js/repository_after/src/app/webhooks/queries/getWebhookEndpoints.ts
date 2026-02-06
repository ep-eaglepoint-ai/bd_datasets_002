import { resolver } from "@blitzjs/rpc"
import db from "db"

export default resolver.pipe(resolver.authorize("ADMIN"), async () => {
  return db.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" } })
})

