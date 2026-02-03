export interface EmailNotificationPayload {
  user_id: string
  notification_type: string
  to: string
  subject: string
  body: string
  timestamp: number
}

export interface DeadLetterQueueEntry {
  jobId: string
  payload: EmailNotificationPayload
  failureReasons: string[]
  failedAt: Date
  totalAttempts: number
}
