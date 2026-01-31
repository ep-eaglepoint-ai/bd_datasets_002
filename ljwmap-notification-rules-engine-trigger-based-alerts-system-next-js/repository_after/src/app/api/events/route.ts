import { NextRequest, NextResponse } from "next/server";
import { processEvent } from "@/lib/engine";
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

    // Process the event through the rules engine
    const result = await processEvent(eventType, payload);

    // Count matched and total rules
    const matchedCount = result.results.filter((r) => r.matched).length;
    const totalRules = result.results.length;

    return NextResponse.json({
      success: true,
      event: result.event,
      summary: {
        rulesEvaluated: totalRules,
        rulesMatched: matchedCount,
        notificationsCreated: result.results
          .filter((r) => r.matched)
          .reduce((sum, r) => sum + (r.notifications?.length || 0), 0),
      },
      results: result.results,
    });
  } catch (error) {
    console.error("Error processing event:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
