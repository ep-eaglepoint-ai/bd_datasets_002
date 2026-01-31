import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.event.deleteMany();
  await prisma.rule.deleteMany();

  // Create Rule 1: Order Failed Alert
  const orderFailedRule = await prisma.rule.create({
    data: {
      name: "Order Failed Alert",
      description: "Alert when an order status changes to failed",
      eventType: "order_status_changed",
      priority: "high",
      cooldownMs: 0,
      channels: JSON.stringify(["in-app", "webhook"]),
      webhookUrl: "https://webhook.site/example",
      enabled: true,
      conditions: {
        create: [
          {
            field: "status",
            operator: "eq",
            value: "failed",
          },
        ],
      },
    },
  });
  console.log(`Created rule: ${orderFailedRule.name}`);

  // Create Rule 2: High Value Order
  const highValueRule = await prisma.rule.create({
    data: {
      name: "High Value Order",
      description: "Notify when an order exceeds $1000",
      eventType: "order_created",
      priority: "medium",
      cooldownMs: 0,
      channels: JSON.stringify(["in-app"]),
      enabled: true,
      conditions: {
        create: [
          {
            field: "amount",
            operator: "gt",
            value: "1000",
          },
        ],
      },
    },
  });
  console.log(`Created rule: ${highValueRule.name}`);

  // Create Rule 3: Payment Retry Needed
  const paymentRetryRule = await prisma.rule.create({
    data: {
      name: "Payment Retry Needed",
      description: "Alert when a payment fails but can still be retried",
      eventType: "payment_failed",
      priority: "critical",
      cooldownMs: 300000, // 5 minutes
      channels: JSON.stringify(["webhook"]),
      webhookUrl: "https://webhook.site/payment-alerts",
      enabled: true,
      conditions: {
        create: [
          {
            field: "retryCount",
            operator: "lt",
            value: "3",
          },
        ],
      },
    },
  });
  console.log(`Created rule: ${paymentRetryRule.name}`);

  // Create Rule 4: New User Welcome
  const newUserRule = await prisma.rule.create({
    data: {
      name: "New User Welcome",
      description: "Send welcome notification for new user registrations",
      eventType: "user_registered",
      priority: "low",
      cooldownMs: 0,
      channels: JSON.stringify(["in-app"]),
      enabled: true,
      conditions: {
        create: [], // No conditions - triggers for all user registrations
      },
    },
  });
  console.log(`Created rule: ${newUserRule.name}`);

  // Create Rule 5: Low Inventory Alert
  const lowInventoryRule = await prisma.rule.create({
    data: {
      name: "Low Inventory Alert",
      description: "Alert when inventory falls below threshold",
      eventType: "inventory_low",
      priority: "high",
      cooldownMs: 3600000, // 1 hour
      channels: JSON.stringify(["in-app", "webhook"]),
      webhookUrl: "https://webhook.site/inventory",
      enabled: true,
      conditions: {
        create: [
          {
            field: "quantity",
            operator: "lte",
            value: "10",
          },
        ],
      },
    },
  });
  console.log(`Created rule: ${lowInventoryRule.name}`);

  // Create Rule 6: VIP Customer Order (multiple conditions)
  const vipOrderRule = await prisma.rule.create({
    data: {
      name: "VIP Customer Order",
      description: "Special notification for VIP customer orders",
      eventType: "order_created",
      priority: "high",
      cooldownMs: 0,
      channels: JSON.stringify(["in-app"]),
      enabled: true,
      conditions: {
        create: [
          {
            field: "customer.type",
            operator: "eq",
            value: "vip",
          },
          {
            field: "amount",
            operator: "gte",
            value: "500",
          },
        ],
      },
    },
  });
  console.log(`Created rule: ${vipOrderRule.name}`);

  // Create some sample events and notifications for demo purposes
  const sampleEvent = await prisma.event.create({
    data: {
      eventType: "order_status_changed",
      payload: JSON.stringify({
        orderId: "ORD-DEMO-001",
        status: "failed",
        previousStatus: "pending",
        reason: "Payment declined",
      }),
    },
  });

  await prisma.notification.create({
    data: {
      ruleId: orderFailedRule.id,
      eventId: sampleEvent.id,
      channel: "in-app",
      status: "sent",
      sentAt: new Date(),
      metadata: JSON.stringify({
        deliveryMethod: "database",
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log("Created sample event and notification");

  console.log("\nSeeding completed!");
  console.log(`
Summary:
- 6 notification rules created
- 1 sample event created
- 1 sample notification created

You can now start the application and test the rules engine.
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
