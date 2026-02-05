"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Settings, TestTube, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, Button, StatusBadge, PriorityBadge } from "@/components/ui";

interface Stats {
  totalRules: number;
  enabledRules: number;
  totalNotifications: number;
  recentNotifications: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
}

interface RecentNotification {
  id: string;
  channel: string;
  status: string;
  createdAt: string;
  rule: {
    name: string;
    priority: string;
  };
  event: {
    eventType: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch rules count
        const rulesRes = await fetch("/api/rules");
        const rulesData = await rulesRes.json();
        
        // Fetch notification stats
        const statsRes = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stats" }),
        });
        const statsData = await statsRes.json();

        // Fetch recent notifications
        const recentRes = await fetch("/api/notifications?limit=5");
        const recentData = await recentRes.json();

        if (rulesData.success && statsData.success) {
          const rules = rulesData.rules;
          setStats({
            totalRules: rules.length,
            enabledRules: rules.filter((r: { enabled: boolean }) => r.enabled).length,
            totalNotifications: statsData.stats.total,
            recentNotifications: statsData.stats.recentCount,
            byStatus: statsData.stats.byStatus,
            byChannel: statsData.stats.byChannel,
          });
        }

        if (recentData.success) {
          setRecentNotifications(recentData.notifications);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Dashboard</h1>
        <p className="mt-1 text-sm text-black">
          Overview of your notification rules engine
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Active Rules</p>
                <p className="text-2xl font-bold text-black">
                  {stats?.enabledRules || 0}
                  <span className="text-sm font-normal text-black">
                    /{stats?.totalRules || 0}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Total Notifications</p>
                <p className="text-2xl font-bold text-black">
                  {stats?.totalNotifications || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Last 24 Hours</p>
                <p className="text-2xl font-bold text-black">
                  {stats?.recentNotifications || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Activity className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-black">Sent Rate</p>
                <p className="text-2xl font-bold text-black">
                  {stats?.totalNotifications
                    ? Math.round(
                        ((stats.byStatus?.sent || 0) / stats.totalNotifications) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-black">Quick Actions</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/rules/new" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-3" />
                Create New Rule
              </Button>
            </Link>
            <Link href="/test" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <TestTube className="h-4 w-4 mr-3" />
                Test an Event
              </Button>
            </Link>
            <Link href="/notifications" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-3" />
                View All Notifications
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-black">Recent Notifications</h2>
              <Link href="/notifications">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <div className="text-center py-8 text-black">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No notifications yet</p>
                <p className="text-sm">Send an event to trigger notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black truncate">
                        {notification.rule.name}
                      </p>
                      <p className="text-xs text-black">
                        {notification.event.eventType} • {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <PriorityBadge priority={notification.rule.priority} />
                      <StatusBadge status={notification.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {stats && stats.totalNotifications > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-black">Notification Breakdown</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {stats.byStatus?.sent || 0}
                </p>
                <p className="text-sm text-black">Sent</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.byStatus?.pending || 0}
                </p>
                <p className="text-sm text-black">Pending</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {stats.byStatus?.failed || 0}
                </p>
                <p className="text-sm text-black">Failed</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {(stats.byChannel?.["in-app"] || 0) + (stats.byChannel?.webhook || 0)}
                </p>
                <p className="text-sm text-black">Total Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
