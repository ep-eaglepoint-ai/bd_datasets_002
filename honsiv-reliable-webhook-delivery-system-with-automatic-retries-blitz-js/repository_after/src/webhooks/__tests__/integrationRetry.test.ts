import { describe, expect, it } from "vitest"
import http from "http"
import { createWebhookSignature } from "../signature"

describe("integration retry behavior", () => {
  it("fails then succeeds against a fake endpoint", async () => {
    let calls = 0
    const server = http.createServer((_, res) => {
      calls += 1
      res.statusCode = calls === 1 ? 500 : 200
      res.end("ok")
    })

    await new Promise<void>((resolve) => server.listen(0, resolve))
    const port = (server.address() as { port: number }).port
    const url = `http://127.0.0.1:${port}`

    const payload = { test: true }
    const timestamp = new Date().toISOString()
    const signature = createWebhookSignature({
      secret: "secret",
      timestamp,
      payload,
    })

    const res1 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": `v1=${signature}`,
      },
      body: JSON.stringify(payload),
    })
    expect(res1.status).toBe(500)

    const res2 = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": `v1=${signature}`,
      },
      body: JSON.stringify(payload),
    })
    expect(res2.status).toBe(200)

    server.close()
  })
})


