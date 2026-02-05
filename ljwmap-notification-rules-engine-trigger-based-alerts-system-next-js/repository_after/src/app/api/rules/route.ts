import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ruleSchema } from "@/lib/validators";

// GET /api/rules - List all rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType");
    const enabled = searchParams.get("enabled");

    const where: Record<string, unknown> = {};
    if (eventType) {
      where.eventType = eventType;
    }
    if (enabled !== null) {
      where.enabled = enabled === "true";
    }

    const rules = await prisma.rule.findMany({
      where,
      include: {
        conditions: true,
        _count: {
          select: { notifications: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      rules: rules.map((rule) => ({
        ...rule,
        channels: JSON.parse(rule.channels),
        notificationCount: rule._count.notifications,
      })),
    });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the rule
    const validationResult = ruleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid rule data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { conditions, channels, ...ruleData } = validationResult.data;

    // Check if webhook channel is selected but no URL provided
    if (channels.includes("webhook") && !ruleData.webhookUrl) {
      return NextResponse.json(
        {
          error: "Webhook URL is required when webhook channel is selected",
        },
        { status: 400 }
      );
    }

    // Create the rule with conditions
    const rule = await prisma.rule.create({
      data: {
        ...ruleData,
        channels: JSON.stringify(channels),
        conditions: {
          create: conditions.map((c) => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
        },
      },
      include: {
        conditions: true,
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        channels: JSON.parse(rule.channels),
      },
    });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
