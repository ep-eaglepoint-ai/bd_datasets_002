"use client"

import { useMutation } from "@blitzjs/rpc"
import retryWebhookDelivery from "@/src/app/webhooks/mutations/retryWebhookDelivery"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

export default function DeliveryActions({ deliveryId }: { deliveryId: number }) {
  const [retry] = useMutation(retryWebhookDelivery)

  return (
    <div style={{ margin: "1rem 0" }}>
      <button
        type="button"
        className={`${styles.button} ${styles.buttonPrimary}`}
        onClick={async () => {
          await retry({ id: deliveryId, force: true })
        }}
      >
        Retry Now
      </button>
    </div>
  )
}


