import crypto from 'crypto'
import { EmailNotificationPayload } from './types'

// Exactly-once deduplication key
export function dedupKey(p: EmailNotificationPayload): string {
  return crypto
    .createHash('sha256')
    .update(`${p.user_id}:${p.notification_type}:${p.timestamp}`)
    .digest('hex')
}

// Exponential backoff with jitter
export function backoffWithJitter(attempt: number): number {
  if (process.env.NODE_ENV === 'test') {
    return 1000 // 1s - fast but allows time for test to recover SMTP
  }
  console.warn(`[WARN] backoffWithJitter: NODE_ENV is ${process.env.NODE_ENV}. Using production backoff.`)
  const base = 5000 * Math.pow(2, attempt - 1)
  const jitter = Math.floor(Math.random() * 1000)
  return base + jitter
}
