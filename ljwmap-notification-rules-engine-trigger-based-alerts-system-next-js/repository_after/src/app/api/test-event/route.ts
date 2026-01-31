import { NextRequest, NextResponse } from "next/server";
import { testEvent } from "@/lib/engine";
import { eventSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the event payload
    const validationResult = eventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid event payload",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { eventType, payload } = validationResult.data;

    // Test the event against rules (without storing or sending)
    const result = await testEvent(eventType, payload);

    return NextResponse.json({
      success: true,
      eventType,
      payload,
      matchedRules: result.matchedRules.map((m) => ({
        id: m.rule.id,
        name: m.rule.name,
        description: m.rule.description,
        priority: m.rule.priority,
        channels: JSON.parse(m.rule.channels),
        conditionResults: m.conditionResults,
      })),
      unmatchedRules: result.unmatchedRules.map((u) => ({
        id: u.rule.id,
        name: u.rule.name,
        description: u.rule.description,
        reason: u.reason,
        conditionResults: u.conditionResults,
      })),
    });
  } catch (error) {
    console.error("Error testing event:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
