import { NextResponse } from "next/server"
import { enqueueWebhookEvent } from "src/webhooks/enqueueWebhookEvent"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const count = await enqueueWebhookEvent(
      body.eventType || "user.created",
      body.eventId || `evt_${Date.now()}`,
      body.payload || { test: true, timestamp: new Date().toISOString() }
    )

    return NextResponse.json({ 
      success: true,
      queued: count,
      message: `Enqueued ${count} webhook(s)`
    })
  } catch (error) {
    console.error("Test webhook error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test webhook endpoint",
    usage: "POST with { eventType, eventId, payload }",
    example: {
      eventType: "user.created",
      eventId: "evt_123",
      payload: { userId: 123, email: "test@example.com" }
    }
  })
}


