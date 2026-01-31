import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Group by date
    const dateMap = new Map<string, { income: number; expenses: number }>();

    transactions.forEach((t) => {
      const dateStr = t.date.toISOString().split("T")[0];
      const current = dateMap.get(dateStr) || { income: 0, expenses: 0 };

      if (t.type === "income") {
        current.income += t.amount;
      } else {
        current.expenses += t.amount;
      }

      dateMap.set(dateStr, current);
    });

    // Convert to array and sort by date
    const trendData = Array.from(dateMap.entries())
      .map(([date, amounts]) => ({
        date,
        ...amounts,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(trendData);
  } catch (error) {
    console.error("GET /api/transactions/trends error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
