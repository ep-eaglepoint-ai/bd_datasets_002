import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/notifications/route";
import { NextRequest } from "next/server";

// Mock the database
vi.mock("@/lib/db", () => ({
  default: {
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db";

const mockedPrisma = vi.mocked(prisma);

describe("/api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockNotification = (overrides = {}) => ({
    id: "notif-1",
    ruleId: "rule-1",
    eventId: "event-1",
    channel: "in-app",
    status: "sent",
    metadata: '{"deliveryMethod":"database"}',
    createdAt: new Date(),
    sentAt: new Date(),
    rule: {
      id: "rule-1",
      name: "Test Rule",
      eventType: "order_created",
      priority: "high",
    },
    event: {
      id: "event-1",
      eventType: "order_created",
      payload: '{"orderId":"123"}',
      receivedAt: new Date(),
    },
    ...overrides,
  });

  describe("GET /api/notifications", () => {
    it("should return list of notifications with pagination", async () => {
      mockedPrisma.notification.count.mockResolvedValue(25);
      mockedPrisma.notification.findMany.mockResolvedValue([createMockNotification()]);

      const request = new NextRequest("http://localhost:3000/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toHaveLength(1);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.page).toBe(1);
    });

    it("should parse JSON fields in notification", async () => {
      mockedPrisma.notification.count.mockResolvedValue(1);
      mockedPrisma.notification.findMany.mockResolvedValue([createMockNotification()]);

      const request = new NextRequest("http://localhost:3000/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(data.notifications[0].metadata).toEqual({ deliveryMethod: "database" });
      expect(data.notifications[0].event.payload).toEqual({ orderId: "123" });
    });

    it("should filter by status", async () => {
      mockedPrisma.notification.count.mockResolvedValue(0);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/notifications?status=sent");
      await GET(request);

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "sent",
          }),
        })
      );
    });

    it("should filter by channel", async () => {
      mockedPrisma.notification.count.mockResolvedValue(0);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/notifications?channel=webhook");
      await GET(request);

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: "webhook",
          }),
        })
      );
    });

    it("should filter by ruleId", async () => {
      mockedPrisma.notification.count.mockResolvedValue(0);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/notifications?ruleId=rule-123");
      await GET(request);

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ruleId: "rule-123",
          }),
        })
      );
    });

    it("should paginate correctly", async () => {
      mockedPrisma.notification.count.mockResolvedValue(50);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/notifications?page=2&limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(5);
      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("should limit max results to 100", async () => {
      mockedPrisma.notification.count.mockResolvedValue(200);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/notifications?limit=500");
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.limit).toBe(100);
      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it("should include rule and event relations", async () => {
      mockedPrisma.notification.count.mockResolvedValue(1);
      mockedPrisma.notification.findMany.mockResolvedValue([createMockNotification()]);

      const request = new NextRequest("http://localhost:3000/api/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(data.notifications[0].rule.name).toBe("Test Rule");
      expect(data.notifications[0].event.eventType).toBe("order_created");
    });
  });

  describe("POST /api/notifications (stats)", () => {
    it("should return notification statistics", async () => {
      mockedPrisma.notification.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25); // recent (last 24h)
      
      mockedPrisma.notification.groupBy
        .mockResolvedValueOnce([ // by status
          { status: "sent", _count: 80 },
          { status: "failed", _count: 15 },
          { status: "pending", _count: 5 },
        ])
        .mockResolvedValueOnce([ // by channel
          { channel: "in-app", _count: 70 },
          { channel: "webhook", _count: 30 },
        ]);

      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stats" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.total).toBe(100);
      expect(data.stats.recentCount).toBe(25);
      expect(data.stats.byStatus.sent).toBe(80);
      expect(data.stats.byStatus.failed).toBe(15);
      expect(data.stats.byChannel["in-app"]).toBe(70);
      expect(data.stats.byChannel.webhook).toBe(30);
    });

    it("should return error for invalid action", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unknown" }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });
  });
});
