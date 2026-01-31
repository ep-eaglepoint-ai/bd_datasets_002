import { invoke } from "@/src/app/blitz-server"
import getWebhookDelivery from "@/src/app/webhooks/queries/getWebhookDelivery"
import { requireAdmin } from "@/src/app/admin/requireAdmin"
import DeliveryActions from "@/src/app/admin/webhooks/components/DeliveryActions"
import { WebhookDeliveryStatus } from "@prisma/client"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ deliveryId: string }>
}) {
  await requireAdmin()
  const { deliveryId } = await params
  const delivery = await invoke(getWebhookDelivery, { id: Number(deliveryId) })

  if (!delivery) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateText}>Delivery not found.</div>
        </div>
      </div>
    )
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "PENDING":
        return styles.statusPending
      case "SENDING":
        return styles.statusSending
      case "SUCCESS":
        return styles.statusSuccess
      case "FAILED":
        return styles.statusFailed
      case "DEAD":
        return styles.statusDead
      default:
        return ""
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Delivery #{delivery.id}</h1>
        <DeliveryActions deliveryId={delivery.id} />
      </div>

      <div className={styles.tableContainer} style={{ marginBottom: "2rem" }}>
        <table className={styles.table}>
          <tbody>
            <tr>
              <th style={{ width: "200px" }}>Status</th>
              <td>
                <span className={`${styles.statusBadge} ${getStatusClass(delivery.status)}`}>
                  {delivery.status}
                </span>
              </td>
            </tr>
            <tr>
              <th>Endpoint</th>
              <td>{delivery.endpoint.name}</td>
            </tr>
            <tr>
              <th>Event Type</th>
              <td>{delivery.eventType}</td>
            </tr>
            <tr>
              <th>Event ID</th>
              <td>
                <code style={{ fontSize: "12px", color: "#667eea" }}>{delivery.eventId}</code>
              </td>
            </tr>
            <tr>
              <th>Attempts</th>
              <td>{delivery.attempts}</td>
            </tr>
            <tr>
              <th>Last Status Code</th>
              <td>{delivery.lastStatusCode ?? "-"}</td>
            </tr>
            <tr>
              <th>Last Error</th>
              <td>{delivery.lastError ?? "-"}</td>
            </tr>
            <tr>
              <th>Next Attempt</th>
              <td>
                {delivery.nextAttemptAt
                  ? new Date(delivery.nextAttemptAt).toLocaleString()
                  : "-"}
              </td>
            </tr>
            <tr>
              <th>Last Attempt</th>
              <td>
                {delivery.lastAttemptAt
                  ? new Date(delivery.lastAttemptAt).toLocaleString()
                  : "-"}
              </td>
            </tr>
            <tr>
              <th>Created</th>
              <td>{new Date(delivery.createdAt).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.tableContainer} style={{ marginBottom: "2rem" }}>
        <h2 style={{ padding: "1rem", margin: 0, borderBottom: "1px solid #e2e8f0" }}>Payload</h2>
        <pre
          style={{
            padding: "1.5rem",
            margin: 0,
            background: "#f7fafc",
            overflow: "auto",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {JSON.stringify(delivery.payload, null, 2)}
        </pre>
      </div>

      <div className={styles.tableContainer}>
        <h2 style={{ padding: "1rem", margin: 0, borderBottom: "1px solid #e2e8f0" }}>
          Attempt History ({delivery.attemptsLog.length})
        </h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Status Code</th>
              <th>Error</th>
              <th>Started</th>
              <th>Finished</th>
            </tr>
          </thead>
          <tbody>
            {delivery.attemptsLog.length > 0 ? (
              delivery.attemptsLog.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.attemptNumber}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${getStatusClass(attempt.status)}`}
                    >
                      {attempt.status}
                    </span>
                  </td>
                  <td>{attempt.statusCode ?? "-"}</td>
                  <td style={{ fontSize: "12px", color: "#718096" }}>
                    {attempt.error ?? "-"}
                  </td>
                  <td>{new Date(attempt.startedAt).toLocaleString()}</td>
                  <td>
                    {attempt.finishedAt ? new Date(attempt.finishedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No attempts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

