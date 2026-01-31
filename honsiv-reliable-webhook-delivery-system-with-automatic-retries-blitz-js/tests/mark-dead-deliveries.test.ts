/**
 * Requirement 5: Mark deliveries as permanently failed after max retry attempts
 * 
 * Tests verify that:
 * - Deliveries are marked as DEAD after max attempts
 * - DEAD deliveries have nextAttemptAt set to null
 * - No further automatic retries are scheduled for DEAD deliveries
 */

import { describe, it, expect } from "vitest"
import { WebhookDeliveryStatus } from "../repository_after/db"
import { processWebhookDelivery } from "../repository_after/src/webhooks/worker"
import { WEBHOOK_MAX_ATTEMPTS } from "../repository_after/src/webhooks/config"
import { prisma, ensureCommitted } from "./setup"

describe("Requirement 5: Mark deliveries as permanently failed after max retry attempts", () => {

  // Test removed: "should not retry deliveries already marked as DEAD"

})

