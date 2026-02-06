import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.instanceItem.deleteMany();
  await prisma.checklistInstance.deleteMany();
  await prisma.templateItem.deleteMany();
  await prisma.template.deleteMany();

  // Create "Daily Standup" Template
  const standup = await prisma.template.create({
    data: {
      title: "Daily Standup",
      description: "Track updates for the daily team sync.",
      items: {
        create: [
          { text: "Yesterday: What did you do?", required: true, order: 0 },
          { text: "Today: What will you do?", required: true, order: 1 },
          { text: "Blockers: Any impediments?", required: true, order: 2 },
          { text: "Update Jira ticket status", required: false, order: 3 },
        ],
      },
    },
  });

  // Create "Release Checklist" Template
  const release = await prisma.template.create({
    data: {
      title: "Production Release",
      description: "Steps to deploy to production.",
      items: {
        create: [
          { text: "Code freeze declared", required: true, order: 0 },
          { text: "All tests passed (CI/CD)", required: true, order: 1 },
          {
            text: "Database migration backup created",
            required: true,
            order: 2,
          },
          { text: "Deploy to Staging", required: true, order: 3 },
          { text: "Verify Staging", required: true, order: 4 },
          { text: "Deploy to Production", required: true, order: 5 },
          { text: "Smoke test Production", required: true, order: 6 },
          { text: "Notify stakeholders", required: false, order: 7 },
        ],
      },
    },
  });

  // Create an active instance for Standup
  await prisma.checklistInstance.create({
    data: {
      title: "Standup - 2024-05-20",
      templateId: standup.id,
      status: "ACTIVE",
      items: {
        create: [
          {
            text: "Yesterday: What did you do?",
            required: true,
            order: 0,
            completed: true,
          },
          {
            text: "Today: What will you do?",
            required: true,
            order: 1,
            completed: false,
          },
          {
            text: "Blockers: Any impediments?",
            required: true,
            order: 2,
            completed: false,
          },
          {
            text: "Update Jira ticket status",
            required: false,
            order: 3,
            completed: false,
          },
        ],
      },
    },
  });

  // Create a completed instance
  await prisma.checklistInstance.create({
    data: {
      title: "Release v1.0.0",
      templateId: release.id,
      status: "COMPLETED",
      items: {
        create: [
          {
            text: "Code freeze declared",
            required: true,
            order: 0,
            completed: true,
          },
          {
            text: "All tests passed (CI/CD)",
            required: true,
            order: 1,
            completed: true,
          },
          {
            text: "Database migration backup created",
            required: true,
            order: 2,
            completed: true,
          },
          {
            text: "Deploy to Staging",
            required: true,
            order: 3,
            completed: true,
          },
          { text: "Verify Staging", required: true, order: 4, completed: true },
          {
            text: "Deploy to Production",
            required: true,
            order: 5,
            completed: true,
          },
          {
            text: "Smoke test Production",
            required: true,
            order: 6,
            completed: true,
          },
          {
            text: "Notify stakeholders",
            required: false,
            order: 7,
            completed: true,
          },
        ],
      },
    },
  });

  console.log("Seeding finished.");
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
