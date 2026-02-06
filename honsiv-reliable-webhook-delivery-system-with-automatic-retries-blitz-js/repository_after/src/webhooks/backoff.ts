import { WEBHOOK_BASE_DELAY_MS, WEBHOOK_MAX_DELAY_MS } from "./config"

export function calculateNextAttemptAt(
  attemptNumber: number,
  now: Date = new Date(),
  rand: () => number = Math.random
) {
  const expDelay = WEBHOOK_BASE_DELAY_MS * Math.pow(2, Math.max(0, attemptNumber - 1))
  const cappedDelay = Math.min(expDelay, WEBHOOK_MAX_DELAY_MS)
  const jitterMultiplier = 0.5 + rand()
  const jitteredDelay = Math.min(
    WEBHOOK_MAX_DELAY_MS,
    Math.round(cappedDelay * jitterMultiplier)
  )

  return new Date(now.getTime() + jitteredDelay)
}

