export const WEBHOOK_MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 10)
export const WEBHOOK_BASE_DELAY_MS = Number(process.env.WEBHOOK_BASE_DELAY_MS ?? 60_000)
export const WEBHOOK_MAX_DELAY_MS = Number(process.env.WEBHOOK_MAX_DELAY_MS ?? 12 * 60 * 60 * 1000)
export const WEBHOOK_REQUEST_TIMEOUT_MS = Number(process.env.WEBHOOK_REQUEST_TIMEOUT_MS ?? 10_000)
export const WEBHOOK_WORKER_CONCURRENCY = Number(process.env.WEBHOOK_WORKER_CONCURRENCY ?? 5)
export const WEBHOOK_JOB_NAME = "webhook-delivery"

