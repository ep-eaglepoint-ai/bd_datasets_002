// Main entry point for the EmailService

// Re-export types
export type { EmailNotificationPayload, DeadLetterQueueEntry } from './types'

// Re-export helper functions
export { dedupKey, backoffWithJitter } from './helpers'

// Re-export main components
export { EmailProducer } from './EmailProducer'
export { NotificationWorker } from './NotificationWorker'
