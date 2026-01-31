"use client";

import { useState, useEffect, use } from "react";
import { RuleForm } from "@/components/RuleForm";
import { AlertCircle } from "lucide-react";

interface EditRulePageProps {
  params: Promise<{ id: string }>;
}

export default function EditRulePage({ params }: EditRulePageProps) {
  const { id } = use(params);
  const [rule, setRule] = useState<{
    name: string;
    description: string;
    eventType: string;
    priority: string;
    cooldownMs: number;
    channels: string[];
    webhookUrl: string;
    enabled: boolean;
    conditions: Array<{
      id: string;
      field: string;
      operator: string;
      value: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRule = async () => {
      try {
        const response = await fetch(`/api/rules/${id}`);
        const data = await response.json();
        if (data.success) {
          setRule({
            name: data.rule.name,
            description: data.rule.description || "",
            eventType: data.rule.eventType,
            priority: data.rule.priority,
            cooldownMs: data.rule.cooldownMs,
            channels: data.rule.channels,
            webhookUrl: data.rule.webhookUrl || "",
            enabled: data.rule.enabled,
            conditions: data.rule.conditions,
          });
        } else {
          setError(data.error || "Failed to fetch rule");
        }
      } catch (err) {
        setError("Failed to fetch rule");
      } finally {
        setLoading(false);
      }
    };

    fetchRule();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
        <span className="text-red-700">{error || "Rule not found"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Edit Rule</h1>
        <p className="mt-1 text-sm text-black">
          Update the notification rule configuration
        </p>
      </div>
      
      <RuleForm initialData={rule} ruleId={id} />
    </div>
  );
}
