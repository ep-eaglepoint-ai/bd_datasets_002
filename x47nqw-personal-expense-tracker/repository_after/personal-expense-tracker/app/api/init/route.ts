import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check if categories exist
    const categoryCount = await prisma.category.count();

    if (categoryCount === 0) {
      // Create default categories
      const categories = [
        { name: "Food", type: "expense", icon: "🍔", color: "#FF6B6B" },
        { name: "Transport", type: "expense", icon: "🚗", color: "#4ECDC4" },
        { name: "Entertainment", type: "expense", icon: "🎬", color: "#45B7D1" },
        { name: "Bills", type: "expense", icon: "📄", color: "#FFA07A" },
        { name: "Shopping", type: "expense", icon: "🛍️", color: "#FFB6C1" },
        { name: "Healthcare", type: "expense", icon: "⚕️", color: "#98D8C8" },
        { name: "Education", type: "expense", icon: "📚", color: "#A8D8EA" },
        { name: "Salary", type: "income", icon: "💰", color: "#52C41A" },
        { name: "Freelance", type: "income", icon: "💼", color: "#1890FF" },
        { name: "Investment", type: "income", icon: "📈", color: "#722ED1" },
        { name: "Bonus", type: "income", icon: "🎁", color: "#EB2F96" },
      ];

      for (const category of categories) {
        await prisma.category.create({
          data: {
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Database initialized with default categories",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Database already initialized",
      categoryCount,
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}
