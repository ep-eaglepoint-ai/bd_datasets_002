"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Button, Card, CardContent, Toggle, PriorityBadge, ChannelBadge } from "@/components/ui";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Rule {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  priority: string;
  cooldownMs: number;
  channels: string[];
  webhookUrl: string | null;
  enabled: boolean;
  createdAt: string;
  conditions: Condition[];
  notificationCount: number;
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/rules");
      const data = await response.json();
      if (data.success) {
        setRules(data.rules);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
        );
      }
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    setDeleting(ruleId);
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    } finally {
      setDeleting(null);
    }
  };

  const formatCooldown = (ms: number): string => {
    if (ms === 0) return "None";
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}min`;
    return `${ms / 3600000}h`;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Notification Rules</h1>
          <p className="mt-1 text-sm text-black">
            Manage rules that trigger notifications based on events
          </p>
        </div>
        <Link href="/rules/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-black mb-2">
              No rules yet
            </h3>
            <p className="text-black mb-4">
              Create your first notification rule to get started
            </p>
            <Link href="/rules/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-black truncate">
                        {rule.name}
                      </h3>
                      <PriorityBadge priority={rule.priority} />
                      {rule.channels.map((channel) => (
                        <ChannelBadge key={channel} channel={channel} />
                      ))}
                    </div>
                    
                    {rule.description && (
                      <p className="text-sm text-black mb-2">
                        {rule.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black">
                      <span>
                        Event: <code className="bg-gray-100 px-1 rounded">{rule.eventType}</code>
                      </span>
                      <span>
                        Conditions: {rule.conditions.length}
                      </span>
                      <span>
                        Cooldown: {formatCooldown(rule.cooldownMs)}
                      </span>
                      <span>
                        Notifications sent: {rule.notificationCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <Toggle
                      enabled={rule.enabled}
                      onChange={(enabled) => toggleRule(rule.id, enabled)}
                    />
                    
                    <Link href={`/rules/${rule.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      disabled={deleting === rule.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
