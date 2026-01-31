"use client"

import Link from "next/link"
import { useMutation, useQuery } from "@blitzjs/rpc"
import getWebhookEndpoints from "@/src/app/webhooks/queries/getWebhookEndpoints"
import setWebhookEndpointEnabled from "@/src/app/webhooks/mutations/setWebhookEndpointEnabled"
import Loading from "@/src/app/loading"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

export default function EndpointsList() {
  const [endpoints] = useQuery(getWebhookEndpoints, {})
  const [toggle] = useMutation(setWebhookEndpointEnabled)

  if (!endpoints) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Webhook Endpoints</h1>
        <Link href="/admin/webhooks/endpoints/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          + New Endpoint
        </Link>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Enabled</th>
              <th>Events</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.length > 0 ? (
              endpoints.map((endpoint) => (
                <tr key={endpoint.id}>
                  <td>
                    <strong>{endpoint.name}</strong>
                  </td>
                  <td>
                    <code style={{ fontSize: "12px", color: "#667eea" }}>{endpoint.url}</code>
                  </td>
                  <td>
                    <span
                      className={`${styles.enabledBadge} ${
                        endpoint.enabled ? styles.enabledYes : styles.enabledNo
                      }`}
                    >
                      {endpoint.enabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.eventTags}>
                      {endpoint.eventTypes.map((eventType) => (
                        <span key={eventType} className={styles.eventTag}>
                          {eventType}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Link
                        href={`/admin/webhooks/endpoints/${endpoint.id}`}
                        className={styles.link}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className={`${styles.button} ${
                          endpoint.enabled ? styles.buttonDanger : styles.buttonSecondary
                        }`}
                        onClick={async () => {
                          await toggle({ id: endpoint.id, enabled: !endpoint.enabled })
                        }}
                      >
                        {endpoint.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  <div className={styles.emptyStateText}>
                    No endpoints found.{" "}
                    <Link href="/admin/webhooks/endpoints/new" className={styles.link}>
                      Create one
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


