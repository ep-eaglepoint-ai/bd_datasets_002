"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@blitzjs/rpc"
import { WebhookDeliveryStatus } from "@prisma/client"
import getWebhookDeliveries from "@/src/app/webhooks/queries/getWebhookDeliveries"
import getWebhookEndpoints from "@/src/app/webhooks/queries/getWebhookEndpoints"
import Loading from "@/src/app/loading"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

export default function DeliveriesList() {
  const [filters, setFilters] = useState({
    status: "",
    eventType: "",
    endpointId: "",
  })

  const [endpoints] = useQuery(getWebhookEndpoints, {})
  const [deliveries] = useQuery(getWebhookDeliveries, {
    status: filters.status ? (filters.status as WebhookDeliveryStatus) : undefined,
    eventType: filters.eventType || undefined,
    endpointId: filters.endpointId ? Number(filters.endpointId) : undefined,
    take: 50,
    skip: 0,
  })

  if (!endpoints || !deliveries) {
    return <Loading />
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
        <h1 className={styles.title}>Webhook Deliveries</h1>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
        >
          <option value="">All statuses</option>
          {Object.values(WebhookDeliveryStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={filters.endpointId}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, endpointId: event.target.value }))
          }
        >
          <option value="">All endpoints</option>
          {endpoints.map((endpoint) => (
            <option key={endpoint.id} value={endpoint.id}>
              {endpoint.name}
            </option>
          ))}
        </select>

        <input
          className={styles.filterInput}
          placeholder="Event type"
          value={filters.eventType}
          onChange={(event) => setFilters((prev) => ({ ...prev, eventType: event.target.value }))}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Endpoint</th>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Next Attempt</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.items && deliveries.items.length > 0 ? (
              deliveries.items.map((delivery) => (
                <tr key={delivery.id}>
                  <td>{delivery.id}</td>
                  <td>{delivery.endpoint.name}</td>
                  <td>{delivery.eventType}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(delivery.status)}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td>{delivery.attempts}</td>
                  <td>
                    {delivery.nextAttemptAt
                      ? new Date(delivery.nextAttemptAt).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <Link
                      href={`/admin/webhooks/deliveries/${delivery.id}`}
                      className={styles.link}
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <div className={styles.emptyStateText}>No deliveries found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


