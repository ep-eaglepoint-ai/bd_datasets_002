"use client";

import { useState, useEffect } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button, Card, CardContent, CardHeader, Select } from "@/components/ui";
import { NotificationTable } from "@/components/NotificationTable";

interface NotificationRule {
  id: string;
  name: string;
  eventType: string;
  priority: string;
}

interface NotificationEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface Notification {
  id: string;
  ruleId: string;
  eventId: string;
  channel: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  sentAt: string | null;
  rule: NotificationRule;
  event: NotificationEvent;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (channelFilter) params.set("channel", channelFilter);

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, statusFilter, channelFilter]);

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "sent", label: "Sent" },
    { value: "failed", label: "Failed" },
  ];

  const channelOptions = [
    { value: "", label: "All channels" },
    { value: "in-app", label: "In-App" },
    { value: "webhook", label: "Webhook" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Notification Log</h1>
          <p className="mt-1 text-sm text-black">
            View all triggered notifications and their delivery status
          </p>
        </div>
        <Button variant="secondary" onClick={fetchNotifications} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
            <Select
              options={channelOptions}
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
            {pagination && (
              <span className="text-sm text-black ml-auto">
                Showing {notifications.length} of {pagination.total} notifications
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <NotificationTable notifications={notifications} />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-black">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={!pagination.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
