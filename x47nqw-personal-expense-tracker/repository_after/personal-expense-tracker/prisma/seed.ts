import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create categories for expenses
  const expenseCategories = [
    { name: "Food & Dining", type: "expense", color: "#f97316", icon: "🍔" },
    { name: "Transport", type: "expense", color: "#06b6d4", icon: "🚗" },
    { name: "Entertainment", type: "expense", color: "#a855f7", icon: "🎬" },
    { name: "Bills & Utilities", type: "expense", color: "#ef4444", icon: "⚡" },
    { name: "Shopping", type: "expense", color: "#ec4899", icon: "🛍️" },
    { name: "Healthcare", type: "expense", color: "#10b981", icon: "🏥" },
    { name: "Education", type: "expense", color: "#3b82f6", icon: "📚" },
    { name: "Other", type: "expense", color: "#6b7280", icon: "📌" },
  ];

  // Create categories for income
  const incomeCategories = [
    { name: "Salary", type: "income", color: "#22c55e", icon: "💰" },
    { name: "Freelance", type: "income", color: "#84cc16", icon: "💻" },
    { name: "Investment", type: "income", color: "#06b6d4", icon: "📈" },
    { name: "Bonus", type: "income", color: "#f59e0b", icon: "🎁" },
    { name: "Other Income", type: "income", color: "#10b981", icon: "💵" },
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];

  for (const category of allCategories) {
    await prisma.category.create({
      data: category,
    });
  }

  console.log("Database seeded successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
