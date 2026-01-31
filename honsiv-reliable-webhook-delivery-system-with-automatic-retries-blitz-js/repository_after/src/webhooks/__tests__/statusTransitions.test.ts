import { describe, expect, it } from "vitest"
import { getFailureUpdate } from "../worker"
import { WebhookDeliveryStatus } from "@prisma/client"

describe("status transitions", () => {
  it("marks DEAD when max attempts reached", () => {
    const update = getFailureUpdate(10, new Date())
    expect(update.status).toBe(WebhookDeliveryStatus.DEAD)
  })

  it("marks FAILED when below max attempts", () => {
    const update = getFailureUpdate(1, new Date())
    expect(update.status).toBe(WebhookDeliveryStatus.FAILED)
  })
})


