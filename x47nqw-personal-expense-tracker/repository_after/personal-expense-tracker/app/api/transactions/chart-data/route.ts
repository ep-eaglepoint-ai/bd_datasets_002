import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "expense",
      },
      include: { category: true },
    });

    const categoryMap = new Map<string, number>();

    transactions.forEach((transaction) => {
      const categoryName = transaction.category.name;
      const current = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, current + transaction.amount);
    });

    const categoryColors = new Map<string, string>();
    transactions.forEach((transaction) => {
      categoryColors.set(
        transaction.category.name,
        transaction.category.color
      );
    });

    const chartData = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount,
        color: categoryColors.get(category) || "#3b82f6",
      })
    );

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("GET /api/transactions/chart-data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
