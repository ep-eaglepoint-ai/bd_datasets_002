import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ruleSchema } from "@/lib/validators";

// GET /api/rules/[id] - Get a single rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rule = await prisma.rule.findUnique({
      where: { id },
      include: {
        conditions: true,
        _count: {
          select: { notifications: true },
        },
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        channels: JSON.parse(rule.channels),
        notificationCount: rule._count.notifications,
      },
    });
  } catch (error) {
    console.error("Error fetching rule:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/rules/[id] - Update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if rule exists
    const existingRule = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

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

    // Update the rule and replace conditions in a transaction
    const rule = await prisma.$transaction(async (tx) => {
      // Delete existing conditions
      await tx.condition.deleteMany({
        where: { ruleId: id },
      });

      // Update rule and create new conditions
      return tx.rule.update({
        where: { id },
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
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        channels: JSON.parse(rule.channels),
      },
    });
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/rules/[id] - Delete a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if rule exists
    const existingRule = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Delete the rule (conditions will be cascade deleted)
    await prisma.rule.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Rule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/rules/[id] - Toggle rule enabled status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if rule exists
    const existingRule = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Only allow toggling enabled status
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request: 'enabled' must be a boolean" },
        { status: 400 }
      );
    }

    const rule = await prisma.rule.update({
      where: { id },
      data: { enabled: body.enabled },
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
    console.error("Error toggling rule:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
