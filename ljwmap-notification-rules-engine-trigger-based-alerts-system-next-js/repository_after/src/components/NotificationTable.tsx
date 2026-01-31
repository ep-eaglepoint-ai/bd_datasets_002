"use client";

import { useState, Fragment } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { StatusBadge, PriorityBadge, ChannelBadge } from "./ui";

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

interface NotificationTableProps {
  notifications: Notification[];
}

export function NotificationTable({ notifications }: NotificationTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 text-black">
        No notifications found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Rule
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Event Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Channel
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
              Priority
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {notifications.map((notification) => (
            <Fragment key={notification.id}>
              <tr
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleExpanded(notification.id)}
              >
                <td className="px-2 py-4">
                  {expandedIds.has(notification.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                  <span title={formatDate(notification.createdAt)}>
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-black">
                    {notification.rule.name}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {notification.event.eventType}
                  </code>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <ChannelBadge channel={notification.channel} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge status={notification.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <PriorityBadge priority={notification.rule.priority} />
                </td>
              </tr>
              {expandedIds.has(notification.id) && (
                <tr key={`${notification.id}-details`}>
                  <td colSpan={7} className="px-4 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-black mb-2">
                          Event Payload
                        </h4>
                        <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-48">
                          {JSON.stringify(notification.event.payload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-black mb-2">
                          Delivery Details
                        </h4>
                        {notification.metadata ? (
                          <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-48">
                            {JSON.stringify(notification.metadata, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-sm text-black">
                            No metadata available
                          </p>
                        )}
                        {notification.sentAt && (
                          <p className="text-xs text-black mt-2">
                            Sent at: {formatDate(notification.sentAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
