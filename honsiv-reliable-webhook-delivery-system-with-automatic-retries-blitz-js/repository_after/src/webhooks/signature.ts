import crypto from "crypto"

export function createWebhookSignature(params: {
  secret: string
  timestamp: string
  payload: unknown
}) {
  const body = JSON.stringify(params.payload)
  const signed = `${params.timestamp}.${body}`
  return crypto.createHmac("sha256", params.secret).update(signed).digest("hex")
}

export function verifyWebhookSignature(params: {
  secret: string
  timestamp: string
  payload: unknown
  signature: string
}) {
  const expected = createWebhookSignature(params)
  const expectedBuffer = Buffer.from(expected, "hex")
  const actualBuffer = Buffer.from(params.signature, "hex")
  if (expectedBuffer.length !== actualBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

