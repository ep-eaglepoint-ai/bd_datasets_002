import { startWebhookWorker } from "../webhooks/worker"

startWebhookWorker().catch((error) => {
  console.error("Webhook worker failed to start", error)
  process.exit(1)
})
import { startWebhookWorker } from "../webhooks/worker"

startWebhookWorker().catch((error) => {
  console.error("Webhook worker failed to start", error)
  process.exit(1)
})

