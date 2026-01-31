import { requireAdmin } from "../../requireAdmin"
import TestWebhookForm from "../components/TestWebhookForm"

export default async function TestWebhookPage() {
  await requireAdmin()
  return (
    <div>
      <h1>Test Webhook System</h1>
      <p>Send a test webhook to all enabled endpoints subscribed to the event type.</p>
      <TestWebhookForm />
    </div>
  )
}


