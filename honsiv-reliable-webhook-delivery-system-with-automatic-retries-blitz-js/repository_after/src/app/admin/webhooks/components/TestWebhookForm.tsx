"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "@/src/app/styles/WebhookAdmin.module.css"

export default function TestWebhookForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    eventType: "user.created",
    eventId: "",
    payload: JSON.stringify({ test: true, userId: 123, email: "test@example.com" }, null, 2),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const payload = JSON.parse(formData.payload)
      const res = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: formData.eventType,
          eventId: formData.eventId || `evt_${Date.now()}`,
          payload,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setTimeout(() => router.push("/admin/webhooks/deliveries"), 2000)
      } else {
        setError(data.error || "Failed to send webhook")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Test Webhook</h1>
      </div>

      <div className={styles.form}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Event Type
              <input
                type="text"
                className={styles.formInput}
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                placeholder="user.created"
                required
              />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Event ID (optional, auto-generated if empty)
              <input
                type="text"
                className={styles.formInput}
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                placeholder="evt_123"
              />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Payload (JSON)
              <textarea
                className={styles.formTextarea}
                value={formData.payload}
                onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                rows={10}
                required
              />
            </label>
          </div>

          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Test Webhook"}
          </button>
        </form>

        {result && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            <strong>Success!</strong> Queued {result.queued} webhook(s). Redirecting to deliveries...
          </div>
        )}

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}


