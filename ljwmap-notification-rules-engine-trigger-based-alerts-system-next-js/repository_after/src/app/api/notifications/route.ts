import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/notifications - List notifications with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    // Filters
    const ruleId = searchParams.get("ruleId");
    const eventType = searchParams.get("eventType");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");

    // Build where clause
    const where: Record<string, unknown> = {};
    if (ruleId) {
      where.ruleId = ruleId;
    }
    if (channel) {
      where.channel = channel;
    }
    if (status) {
      where.status = status;
    }
    if (eventType) {
      where.event = { eventType };
    }

    // Get total count for pagination
    const total = await prisma.notification.count({ where });

    // Get notifications with relations
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            eventType: true,
            priority: true,
          },
        },
        event: {
          select: {
            id: true,
            eventType: true,
            payload: true,
            receivedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Parse JSON fields
    const formattedNotifications = notifications.map((n) => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
      event: {
        ...n.event,
        payload: JSON.parse(n.event.payload),
      },
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET /api/notifications/stats - Get notification statistics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === "stats") {
      // Get notification statistics
      const [total, byStatus, byChannel, recentCount] = await Promise.all([
        prisma.notification.count(),
        prisma.notification.groupBy({
          by: ["status"],
          _count: true,
        }),
        prisma.notification.groupBy({
          by: ["channel"],
          _count: true,
        }),
        prisma.notification.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      const statusCounts = byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      );

      const channelCounts = byChannel.reduce(
        (acc, item) => {
          acc[item.channel] = item._count;
          return acc;
        },
        {} as Record<string, number>
      );

      return NextResponse.json({
        success: true,
        stats: {
          total,
          recentCount,
          byStatus: statusCounts,
          byChannel: channelCounts,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error getting notification stats:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
